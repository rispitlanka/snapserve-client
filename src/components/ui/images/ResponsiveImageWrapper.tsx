import Image from "next/image";

interface ResponsiveImageWrapperProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  priority?: boolean;
}

/**
 * Responsive Image wrapper that maintains aspect ratio
 * Always requires both width and height to prevent warnings
 */
export default function ResponsiveImageWrapper({
  src,
  alt,
  width,
  height,
  className = "w-full",
  priority = false,
}: ResponsiveImageWrapperProps) {
  const aspectRatio = (width / height) * 100;

  return (
    <div
      className="overflow-hidden"
      style={{
        aspectRatio: `${width}/${height}`,
      }}
    >
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        className={className}
        style={{
          width: "100%",
          height: "auto",
          objectFit: "cover",
        }}
      />
    </div>
  );
}
