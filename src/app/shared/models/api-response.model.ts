export interface ApiResponse<T = any> 
{
  success: boolean;
  message: string;
  statusCode: number;
  data: T | null; 
}