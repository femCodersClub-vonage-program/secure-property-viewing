interface ParallaxImageProps {
  src: string
  className?: string
}

// Decorative. It fills its nearest positioned parent. Clip, not hidden: overflow-hidden makes a
// scroll container, and the parallax would follow that one instead of the page
function ParallaxImage({ src, className }: ParallaxImageProps) {
  return (
    <div className={['absolute inset-0 overflow-clip', className ?? ''].join(' ').trim()}>
      <img src={src} alt="" className="parallax absolute inset-x-0 w-full object-cover" />
    </div>
  )
}

export default ParallaxImage
