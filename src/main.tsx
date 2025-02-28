import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { useEffect } from 'react'

createRoot(document.getElementById("root")!).render(<App />);

// Add console logging to check viewport dimensions on resize
useEffect(() => {
  const handleResize = () => {
    console.log('Viewport width:', window.innerWidth);
    console.log('Illustration container width:', 
      document.querySelector('.illustration-container')?.clientWidth);
  };
  
  window.addEventListener('resize', handleResize);
  // Log on initial render
  handleResize();
  
  return () => window.removeEventListener('resize', handleResize);
}, []);

// Add performance monitoring for animations
useEffect(() => {
  let frameCount = 0;
  let lastTime = performance.now();
  
  const checkPerformance = (time) => {
    frameCount++;
    
    if (time - lastTime > 1000) {
      const fps = Math.round((frameCount * 1000) / (time - lastTime));
      console.log('Animation performance (FPS):', fps);
      
      frameCount = 0;
      lastTime = time;
    }
    
    requestAnimationFrame(checkPerformance);
  };
  
  const animationId = requestAnimationFrame(checkPerformance);
  return () => cancelAnimationFrame(animationId);
}, []);

// Add class validation
useEffect(() => {
  // Check if Tailwind is properly applying animation classes
  const animatedElements = document.querySelectorAll('.animate-pulse');
  console.log('Animated elements found:', animatedElements.length);
  
  // Check computed styles
  if (animatedElements.length > 0) {
    const computedStyle = window.getComputedStyle(animatedElements[0]);
    console.log('Animation applied:', computedStyle.animation);
  }
}, []);
