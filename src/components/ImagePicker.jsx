import { useRef } from 'react'
import { Avatar, Button } from '@fluentui/react-components'
import { ImageAddRegular, DismissRegular } from '@fluentui/react-icons'

// Downscale client-side so the stored data URI stays small enough for JSON sync.
async function resizeToDataUri(file, maxPx) {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxPx / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', 0.85)
}

// compact = button only (for table rows that already show the avatar)
export default function ImagePicker({ name, value, onChange, maxPx = 128, square = false, compact = false }) {
  const inputRef = useRef(null)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {!compact && (
        <Avatar
          name={name || '?'}
          color="colorful"
          shape={square ? 'square' : 'circular'}
          size={48}
          image={value ? { src: value } : undefined}
        />
      )}
      <Button
        size="small"
        appearance={compact ? 'subtle' : 'secondary'}
        icon={<ImageAddRegular />}
        aria-label={value ? 'Change image' : 'Add image'}
        onClick={() => inputRef.current.click()}
      >
        {compact ? '' : value ? 'Change' : 'Add image'}
      </Button>
      {value && (
        <Button
          size="small"
          appearance="subtle"
          icon={<DismissRegular />}
          aria-label="Remove image"
          onClick={() => onChange(null)}
        >
          {compact ? '' : 'Remove'}
        </Button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={async (e) => {
          const file = e.target.files[0]
          if (file) onChange(await resizeToDataUri(file, maxPx))
          e.target.value = ''
        }}
      />
    </div>
  )
}
