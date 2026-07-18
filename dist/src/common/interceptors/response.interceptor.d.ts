import { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
type ResponseEnvelope<T> = {
    statusCode: number;
    timestamp: string;
    path: string;
    data: T;
};
export declare class ResponseInterceptor<T> implements NestInterceptor<T, ResponseEnvelope<T>> {
    intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ResponseEnvelope<T>>;
}
export {};
