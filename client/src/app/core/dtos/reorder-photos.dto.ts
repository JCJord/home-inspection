export interface PhotoOrderDto {
  id: string;
  sort_order: number;
}

export interface ReorderPhotosDto {
  photos: PhotoOrderDto[];
}
