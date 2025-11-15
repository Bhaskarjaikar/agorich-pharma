'use client'

import Image from "next/image";
import { useEffect, useState } from "react";

type BackgroundSlideshowProps = {
	images: string[];
	intervalMs?: number;
	/** Optional overlay color to ensure foreground text remains readable */
	overlayClassName?: string;
  /** Optional color grading overlay to keep brand look consistent */
  gradeClassName?: string;
  /** Optional hue/tint layer to shift overall color harmoniously */
  tintClassName?: string;
  /** Amount of blur applied to the background image in pixels */
  blurPx?: number;
};

export default function BackgroundSlideshow({
	images,
	intervalMs = 5000,
	overlayClassName = "bg-black/40",
  gradeClassName = "bg-gradient-to-br from-blue-600/25 via-indigo-700/20 to-purple-700/25 mix-blend-multiply",
  tintClassName = "bg-sky-600/15 mix-blend-color",
  blurPx = 3,
}: BackgroundSlideshowProps) {
	const [activeIndex, setActiveIndex] = useState(0);

	useEffect(() => {
		if (images.length <= 1) return;
		const id = setInterval(() => {
			setActiveIndex((prev) => (prev + 1) % images.length);
		}, intervalMs);
		return () => clearInterval(id);
	}, [images.length, intervalMs]);

	return (
		<div className="absolute inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden>
			{/* Slides */}
			{images.map((src, index) => (
				<div
					key={src + index}
					className={`absolute inset-0 transition-opacity duration-1500 ease-in-out ${
						index === activeIndex ? "opacity-100 z-10" : "opacity-0 z-0"
					}`}
				>
							<Image
								src={src}
								alt="Background slide"
								fill
								priority={index === 0}
						quality={90}
						className="object-cover will-change-transform"
								style={{
							objectPosition: "50% 50%",
							filter: `blur(${blurPx}px) saturate(0.6) brightness(0.4) contrast(1.2)`,
							transform: 'scale(1.08)'
								}}
						sizes="100vw"
							/>
				</div>
			))}

			{/* Brand color grading overlay for consistent look */}
			<div className={`absolute inset-0 ${gradeClassName}`} />
      {/* Subtle hue shift for teal/cool cinematic tone */}
      <div className={`absolute inset-0 ${tintClassName}`} />
			{/* Dark overlay so prior text/content is readable */}
			<div className={`absolute inset-0 ${overlayClassName}`} />
		</div>
	);
}


