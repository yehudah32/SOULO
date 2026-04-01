"use client"

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Quote } from 'lucide-react';
// Using <img> instead of next/image to avoid hostname config for external avatars

interface Testimonial {
  id: number;
  quote: string;
  name: string;
  title: string;
  avatar: string;
}

const defaultTestimonials: Testimonial[] = [
  { id: 1, quote: "This wasn't a test. It was a mirror. For the first time, I understood why I do what I do — and what it's costing me.", name: "Rachel M.", title: "Therapist", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=96&h=96&fit=crop&crop=face" },
  { id: 2, quote: "I've taken every Enneagram test out there. This is the only one that made me feel seen instead of sorted.", name: "David K.", title: "Entrepreneur", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=96&h=96&fit=crop&crop=face" },
  { id: 3, quote: "The conversation felt like talking to a wise friend who knows you better than you know yourself. Uncomfortable and liberating.", name: "Sarah L.", title: "Teacher", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=96&h=96&fit=crop&crop=face" },
  { id: 4, quote: "Baruch's framework changed how I lead my team. Understanding React vs Respond was a game-changer for me.", name: "Michael T.", title: "VP of Engineering", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=96&h=96&fit=crop&crop=face" },
  { id: 5, quote: "You are not a number. That line hit me. This assessment proves it — it sees the whole person, not just the pattern.", name: "Priya S.", title: "Clinical Psychologist", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=96&h=96&fit=crop&crop=face" },
];

const getVisibleCount = (width: number): number => {
  if (width >= 1280) return 3;
  if (width >= 768) return 2;
  return 1;
};

interface TestimonialSliderProps {
  testimonials?: Testimonial[];
}

const TestimonialSlider: React.FC<TestimonialSliderProps> = ({ testimonials = defaultTestimonials }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);
  const [direction, setDirection] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => {
      const newWidth = window.innerWidth;
      setWindowWidth(newWidth);
      const newVisibleCount = getVisibleCount(newWidth);
      const maxIndexForNewWidth = testimonials.length - newVisibleCount;
      if (currentIndex > maxIndexForNewWidth) {
        setCurrentIndex(Math.max(0, maxIndexForNewWidth));
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [windowWidth, currentIndex, testimonials.length]);

  useEffect(() => {
    if (!isAutoPlaying) return;
    autoPlayRef.current = setInterval(() => {
      const visibleCount = getVisibleCount(windowWidth);
      const maxIndex = testimonials.length - visibleCount;
      setCurrentIndex(prev => {
        if (prev >= maxIndex) { setDirection(-1); return prev - 1; }
        if (prev <= 0) { setDirection(1); return prev + 1; }
        return prev + direction;
      });
    }, 4000);
    return () => { if (autoPlayRef.current) clearInterval(autoPlayRef.current); };
  }, [isAutoPlaying, windowWidth, direction, testimonials.length]);

  const visibleCount = getVisibleCount(windowWidth);
  const maxIndex = testimonials.length - visibleCount;
  const canGoNext = currentIndex < maxIndex;
  const canGoPrev = currentIndex > 0;

  const pauseAutoPlay = () => { setIsAutoPlaying(false); setTimeout(() => setIsAutoPlaying(true), 8000); };
  const goNext = () => { if (canGoNext) { setDirection(1); setCurrentIndex(prev => Math.min(prev + 1, maxIndex)); pauseAutoPlay(); } };
  const goPrev = () => { if (canGoPrev) { setDirection(-1); setCurrentIndex(prev => Math.max(prev - 1, 0)); pauseAutoPlay(); } };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleDragEnd = (_event: any, info: any) => {
    if (info.offset.x < -30 && canGoNext) goNext();
    else if (info.offset.x > 30 && canGoPrev) goPrev();
  };

  return (
    <div className="px-4 py-8 sm:py-16 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8 sm:mb-12 md:mb-16"
        >
          <span className="inline-block py-1 px-3 rounded-full bg-[#2563EB]/10 text-[#2563EB] font-medium text-xs sm:text-sm uppercase tracking-wider">
            Testimonials
          </span>
          <h3 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-[#2C2C2C] mt-3 sm:mt-4 px-4">
            Hear It From Them
          </h3>
          <div className="w-16 sm:w-24 h-1 bg-gradient-to-r from-[#2563EB] to-[#2563EB]/50 mx-auto mt-4 sm:mt-6 rounded-full" />
        </motion.div>

        <div className="relative" ref={containerRef}>
          <div className="flex justify-center sm:justify-end sm:absolute sm:-top-16 right-0 space-x-2 mb-4 sm:mb-0">
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} onClick={goPrev} disabled={!canGoPrev}
              className={`p-2 rounded-full ${canGoPrev ? 'bg-white shadow-md hover:bg-[#F0F4FF] text-[#2563EB]' : 'bg-[#F0EDE8] text-[#9B9590] cursor-not-allowed'} transition-all duration-300`}
              aria-label="Previous">
              <ChevronLeft size={20} className="w-4 h-4 sm:w-5 sm:h-5" />
            </motion.button>
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} onClick={goNext} disabled={!canGoNext}
              className={`p-2 rounded-full ${canGoNext ? 'bg-white shadow-md hover:bg-[#F0F4FF] text-[#2563EB]' : 'bg-[#F0EDE8] text-[#9B9590] cursor-not-allowed'} transition-all duration-300`}
              aria-label="Next">
              <ChevronRight size={20} className="w-4 h-4 sm:w-5 sm:h-5" />
            </motion.button>
          </div>

          <div className="overflow-hidden relative px-2 sm:px-0">
            <motion.div className="flex"
              animate={{ x: `-${currentIndex * (100 / visibleCount)}%` }}
              transition={{ type: 'spring', stiffness: 70, damping: 20 }}>
              {testimonials.map((t) => (
                <motion.div key={t.id}
                  className={`flex-shrink-0 w-full ${visibleCount === 3 ? 'md:w-1/3' : visibleCount === 2 ? 'md:w-1/2' : 'w-full'} p-2`}
                  drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.2} onDragEnd={handleDragEnd}
                  whileHover={{ y: -5 }} style={{ cursor: 'grab' }}>
                  <div className="relative overflow-hidden rounded-2xl p-5 sm:p-6 h-full bg-white border border-[#E8E4E0] shadow-sm hover:shadow-md transition-shadow">
                    <div className="absolute -top-4 -left-4 opacity-10">
                      <Quote size={windowWidth < 640 ? 40 : 60} className="text-[#2563EB]" />
                    </div>
                    <div className="relative z-10 h-full flex flex-col">
                      <p className="font-serif text-sm sm:text-base text-[#2C2C2C] leading-relaxed mb-4 sm:mb-6">
                        &ldquo;{t.quote}&rdquo;
                      </p>
                      <div className="mt-auto pt-3 sm:pt-4 border-t border-[#E8E4E0]">
                        <div className="flex items-center">
                          <img src={t.avatar} alt={t.name}
                            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-white shadow-sm" />
                          <div className="ml-3">
                            <h4 className="font-sans font-semibold text-sm text-[#2C2C2C]">{t.name}</h4>
                            <p className="font-sans text-xs text-[#9B9590]">{t.title}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>

          <div className="flex justify-center mt-6 sm:mt-8">
            {Array.from({ length: testimonials.length - visibleCount + 1 }, (_, index) => (
              <button key={index} onClick={() => { setCurrentIndex(index); pauseAutoPlay(); }}
                className="relative mx-1 focus:outline-none" aria-label={`Go to slide ${index + 1}`}>
                <div className={`w-2 h-2 rounded-full transition-colors ${index === currentIndex ? 'bg-[#2563EB]' : 'bg-[#D0CAC4]'}`} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestimonialSlider;
