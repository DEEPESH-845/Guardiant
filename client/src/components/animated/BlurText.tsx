'use client';
import { motion, Variants } from 'motion/react';
import { useRef, useEffect, useState } from 'react';

type BlurTextProps = {
  text?: string;
  delay?: number;
  className?: string;
  animateBy?: 'words' | 'letters';
  direction?: 'top' | 'bottom';
  threshold?: number;
  rootMargin?: string;
  animationFrom?: Record<string, string | number>;
  animationTo?: Array<Record<string, string | number>>;
  easing?: (t: number) => number;
  onAnimationComplete?: () => void;
};

const BlurText: React.FC<BlurTextProps> = ({
  text = '',
  delay = 0.2,
  className = '',
  animateBy = 'words',
  direction = 'top',
  threshold = 0.1,
  rootMargin = '0px',
  animationFrom,
  animationTo,
  easing,
  onAnimationComplete,
}) => {
  const elements = animateBy === 'words' ? text.split(' ') : text.split('');
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);
  const [hasCompleted, setHasCompleted] = useState(false);

  const getVariants = (index: number): Variants => {
    const yOffset = direction === 'top' ? -50 : 50;
    const midYOffset = direction === 'top' ? 5 : -5;

    return {
      hidden: animationFrom || {
        filter: 'blur(10px)',
        opacity: 0,
        y: yOffset,
      },
      visible: {
        filter: 'blur(0px)',
        opacity: 1,
        y: 0,
        transition: {
          delay: index * delay,
          duration: 0.5,
          ease: easing ? easing : 'easeOut',

          ...(animationTo ? { times: [0, 0.5, 1] } : {}),
        },
      },
    };
  };

  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.unobserve(ref.current!);
        }
      },
      { threshold, rootMargin },
    );

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  const handleAnimationComplete = () => {
    if (!hasCompleted) {
      setHasCompleted(true);
      if (onAnimationComplete) {
        onAnimationComplete();
      }
    }
  };

  return (
    <motion.p
      ref={ref}
      className={className}
      style={{ display: 'flex', flexWrap: 'wrap' }}
      onAnimationComplete={handleAnimationComplete}
    >
      {elements.map((element, index) => (
        <motion.span
          key={index}
          style={{
            display: 'inline-block',
            willChange: 'transform, filter, opacity',
          }}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          variants={getVariants(index)}
        >
          {element === ' ' ? '\u00A0' : element}
          {animateBy === 'words' && index < elements.length - 1 && '\u00A0'}
        </motion.span>
      ))}
    </motion.p>
  );
};

export default BlurText;
