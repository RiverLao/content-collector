'use client'

interface TagFilterProps {
  tags: string[]
  selectedTag: string | null
  onSelectTag: (tag: string | null) => void
}

export function TagFilter({
  tags,
  selectedTag,
  onSelectTag
}: TagFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onSelectTag(null)}
        className={`px-3 py-1 text-xs font-medium rounded-full transition-colors
                    ${!selectedTag
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
      >
        全部
      </button>

      {tags.map(tag => (
        <button
          key={tag}
          onClick={() => onSelectTag(selectedTag === tag ? null : tag)}
          className={`px-3 py-1 text-xs font-medium rounded-full transition-colors
                      ${selectedTag === tag
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          {tag}
        </button>
      ))}
    </div>
  )
}
