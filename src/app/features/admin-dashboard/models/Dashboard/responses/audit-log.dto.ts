export interface AuditLogDto {
    id: number;
    userEmail?: string;
    type: string;
    tableName: string;
    dateTime: Date;
    oldValues?: string;
    newValues?: string;
    affectedColumns?: string;
    primaryKey: string;
}

export interface AuditLogQueryDto {
    pageNumber: number;
    pageSize: number;
    searchEmail?: string;
    searchTable?: string;
    searchType?: string;
}
