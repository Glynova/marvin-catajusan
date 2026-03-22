import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  wrapperClassName?: string;
}

const LazyImage = ({ src, alt, className, wrapperClassName, ...props }: LazyImageProps) => {
  const [loaded, setLoaded] = useState(false);
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); observer.disconnect(); } },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={cn("relative overflow-hidden", wrapperClassName)}>
      {!loaded && <div className="absolute inset-0 shimmer rounded-inherit bg-muted" />}
      {inView && (
        <img
          src={src}
          alt={alt || ""}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          className={cn("transition-opacity duration-500", loaded ? "opacity-100" : "opacity-0", className)}
          {...props}
        />
      )}
    </div>
  );
};

export default LazyImage;
