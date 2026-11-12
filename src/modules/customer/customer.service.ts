import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GetCustomersQueryDto } from './dto/get-customers-query.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { Prisma } from '@prisma/client';

export interface CustomerResponseItem {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  phone?: string;
  ordersCount: number;
  totalSpent: number;
  status: 'active' | 'suspended';
  dateJoined: string;
}

@Injectable()
export class CustomerService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Filter condition to exclusively target standard / customer users
   * and exclude staff (Admin, Billing User, Super Admin).
   */
  private getCustomerRoleWhere(): Prisma.UserWhereInput {
    return {
      OR: [
        { role: { slug: 'user' } },
        { role: { name: 'User' } },
        { roleId: null },
        { role: null },
        {
          NOT: {
            role: {
              slug: { in: ['admin', 'super-admin', 'billing-user'] },
            },
          },
        },
      ],
    };
  }

  /**
   * Find paginated list of customers with their profiles and order aggregations
   */
  async findAll(query: GetCustomersQueryDto) {
    const {
      page = 1,
      limit = 10,
      search,
      status = 'all',
      sortBy = 'createdAt',
      sortDir = 'desc',
    } = query;

    const skip = (page - 1) * limit;

    const andConditions: Prisma.UserWhereInput[] = [
      this.getCustomerRoleWhere(),
    ];

    // Search filter across name, email, and profile mobile number
    if (search && search.trim()) {
      const s = search.trim();
      andConditions.push({
        OR: [
          { name: { contains: s, mode: 'insensitive' } },
          { email: { contains: s, mode: 'insensitive' } },
          { profile: { mobileNumber: { contains: s, mode: 'insensitive' } } },
        ],
      });
    }

    // Status filter
    if (status && status !== 'all') {
      andConditions.push({
        status: { equals: status, mode: 'insensitive' },
      });
    }

    const where: Prisma.UserWhereInput = {
      AND: andConditions,
    };

    // DB sort if sorting by direct User fields
    const directSortFields = ['name', 'email', 'status', 'createdAt'];
    const isDirectSort = directSortFields.includes(sortBy);

    // Fetch all matching users for computed fields (or paginated if direct sort)
    // To support accurate sorting by ordersCount and totalSpent, we can fetch matching users
    const [rawUsers, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        ...(isDirectSort
          ? {
              skip,
              take: limit,
              orderBy: {
                [sortBy]: sortDir,
              },
            }
          : {}),
        include: {
          profile: true,
          orders: {
            select: {
              id: true,
              totalAmount: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    // Map and calculate aggregated customer business logic
    let mappedCustomers: CustomerResponseItem[] = rawUsers.map((user) => {
      const ordersCount = user.orders?.length || 0;
      const totalSpent = (user.orders || []).reduce((sum, order) => {
        return sum + (order.totalAmount ? Number(order.totalAmount) : 0);
      }, 0);

      const userStatus = (user.status || 'ACTIVE').toLowerCase();
      const normalizedStatus: 'active' | 'suspended' =
        userStatus === 'suspended' ? 'suspended' : 'active';

      return {
        id: user.id,
        name: user.name || user.email.split('@')[0],
        email: user.email,
        avatar: user.profile?.profileImageUrl || undefined,
        phone: user.profile?.mobileNumber || undefined,
        ordersCount,
        totalSpent: Math.round(totalSpent * 100) / 100,
        status: normalizedStatus,
        dateJoined: user.createdAt.toISOString(),
      };
    });

    // In-memory sort if sorting by calculated fields (ordersCount, totalSpent)
    if (!isDirectSort) {
      mappedCustomers.sort((a, b) => {
        const recordA = a as unknown as Record<string, unknown>;
        const recordB = b as unknown as Record<string, unknown>;
        const valA = recordA[sortBy];
        const valB = recordB[sortBy];
        const numA = typeof valA === 'number' ? valA : 0;
        const numB = typeof valB === 'number' ? valB : 0;
        return sortDir === 'asc' ? numA - numB : numB - numA;
      });

      // Slice for pagination
      mappedCustomers = mappedCustomers.slice(skip, skip + limit);
    }

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      data: mappedCustomers,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Find single customer details by ID including full order history and profile
   */
  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        profile: true,
        orders: {
          orderBy: { orderedAt: 'desc' },
          include: {
            orderItems: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    sku: true,
                    basePrice: true,
                    finalPrice: true,
                    images: true,
                  },
                },
              },
            },
            shipment: true,
          },
        },
        role: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        activityLogs: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: { action: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`Customer with ID "${id}" not found.`);
    }

    const ordersCount = user.orders?.length || 0;
    const totalSpent = (user.orders || []).reduce((sum, order) => {
      return sum + (order.totalAmount ? Number(order.totalAmount) : 0);
    }, 0);

    const userStatus = (user.status || 'ACTIVE').toLowerCase();
    const normalizedStatus: 'active' | 'suspended' =
      userStatus === 'suspended' ? 'suspended' : 'active';

    // Format address from user profile or from latest order shipment
    const latestShipment = user.orders?.[0]?.shipment?.[0];
    const shippingAddress = {
      street:
        user.profile?.address ||
        latestShipment?.shippingAddress ||
        'Not provided',
      city: user.profile?.district || latestShipment?.city || '',
      state: user.profile?.state || latestShipment?.state || '',
      zip: user.profile?.pincode || latestShipment?.postalCode || '',
      country: latestShipment?.country || 'India',
    };

    // Format orders for the customer details UI
    const formattedOrders = user.orders.map((o) => ({
      id: o.orderNumber || o.id,
      customerName: user.name || user.email.split('@')[0],
      email: user.email,
      itemsCount: o.orderItems?.length || 0,
      total: Number(o.totalAmount || 0),
      status: (o.orderStatus || 'PENDING').toLowerCase(),
      paymentStatus: (o.paymentStatus || 'PENDING').toLowerCase(),
      date: o.orderedAt.toISOString(),
      shippingMethod: o.shipment?.[0]?.courierName || 'Standard Delivery',
      trackingId: o.shipment?.[0]?.trackingNumber || undefined,
      carrier: o.shipment?.[0]?.courierName || undefined,
      deliveryStatus: (
        o.shipment?.[0]?.shipmentStatus || 'PENDING'
      ).toLowerCase(),
      items: o.orderItems.map((item) => ({
        id: item.id,
        productId: item.productId,
        name: item.product?.name || 'Product',
        sku: item.product?.sku || 'N/A',
        quantity: item.quantity,
        price: Number(item.price),
        total: Number(item.total),
      })),
    }));

    return {
      id: user.id,
      name: user.name || user.email.split('@')[0],
      email: user.email,
      avatar: user.profile?.profileImageUrl || undefined,
      phone: user.profile?.mobileNumber || undefined,
      status: normalizedStatus,
      dateJoined: user.createdAt.toISOString(),
      ordersCount,
      totalSpent: Math.round(totalSpent * 100) / 100,
      address: {
        shipping: shippingAddress,
        billing: shippingAddress,
      },
      orders: formattedOrders,
      activityLogs: user.activityLogs.map((log) => ({
        id: String(log.id),
        event: log.description || log.action?.name || 'Activity recorded',
        date: log.createdAt.toISOString(),
        action: log.action?.name || 'activity',
      })),
    };
  }

  /**
   * Update customer profile and basic details
   */
  async update(id: string, dto: UpdateCustomerDto) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Customer with ID "${id}" not found.`);
    }

    // Check email uniqueness if email is changed
    if (dto.email && dto.email !== existing.email) {
      const emailExists = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (emailExists) {
        throw new BadRequestException('A user with this email already exists.');
      }
    }

    const userUpdateData: Prisma.UserUpdateInput = {};
    if (dto.name !== undefined) userUpdateData.name = dto.name;
    if (dto.email !== undefined) userUpdateData.email = dto.email;
    if (dto.status !== undefined) {
      userUpdateData.status = dto.status.toUpperCase();
    }

    // Update User
    await this.prisma.user.update({
      where: { id },
      data: userUpdateData,
      include: { profile: true },
    });

    // Update or create UserProfile if phone is provided
    if (dto.phone !== undefined) {
      await this.prisma.userProfile.upsert({
        where: { userId: id },
        create: {
          userId: id,
          mobileNumber: dto.phone,
        },
        update: {
          mobileNumber: dto.phone,
        },
      });
    }

    return this.findOne(id);
  }

  /**
   * Toggle or update account status ('active' | 'suspended')
   */
  async updateStatus(id: string, status: string) {
    const normalized =
      status.toUpperCase() === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE';
    await this.prisma.user.update({
      where: { id },
      data: { status: normalized },
    });

    return {
      id,
      status: normalized.toLowerCase(),
      message: `Customer account is now ${normalized.toLowerCase()}.`,
    };
  }

  /**
   * Delete customer account
   */
  async remove(id: string) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Customer with ID "${id}" not found.`);
    }

    // Delete customer
    await this.prisma.user.delete({
      where: { id },
    });

    return {
      id,
      message: `Customer "${existing.name || existing.email}" deleted successfully.`,
    };
  }
}
