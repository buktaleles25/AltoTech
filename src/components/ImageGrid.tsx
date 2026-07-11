import type { ImageItem } from '../types'
import { ImageCard } from './ImageCard'

interface Props {
  images: ImageItem[]
  onRemove: (id: string) => void
  notify?: (msg: string) => void
}

export function ImageGrid({ images, onRemove, notify }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {images.map((item) => (
        <ImageCard key={item.id} item={item} onRemove={onRemove} notify={notify} />
      ))}
    </div>
  )
}
