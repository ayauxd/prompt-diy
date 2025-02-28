# Crackedpromptdev

A modern, accessible prompt engineering tool with multiple modes to help you create better prompts for AI models.

## Features

- **Multiple Prompt Modes**: Choose between Quick, Creative Flow, and CrackedAF modes for different prompt generation styles
- **Accessibility Focused**: WCAG 2.1 AA compliant with proper contrast ratios and ARIA attributes
- **Responsive Design**: Works seamlessly on mobile and desktop devices
- **Performance Optimized**: Lightweight with minimal dependencies for faster load times
- **Analytics Integration**: Track user engagement and session metrics
- **Keyboard Navigation**: Full keyboard support for all interactive elements
- **Copy Functionality**: Easily copy generated prompts to clipboard

## Technologies Used

- Vite
- TypeScript
- React
- shadcn-ui (minimal components)
- Tailwind CSS
- React Router

## Dependency Cleanup

This project has been optimized by removing unused dependencies to improve performance and reduce bundle size:

- Removed unnecessary Radix UI components
- Removed animation libraries (framer-motion, gsap)
- Removed unused utility libraries
- Streamlined to essential dependencies only

## Getting Started

Follow these steps to run the project locally:

```sh
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to the project directory
cd crackedpromptdev

# Install dependencies
npm install

# Start the development server
npm run dev
```

The application will be available at http://localhost:3000 (or another port if 3000 is in use)

## Project Structure

- `src/pages/Index.tsx`: Main application page with chat interface
- `src/components/ChatUI.tsx`: Core chat component with multiple modes
- `src/components/ui/`: UI components from shadcn-ui
- `src/hooks/`: Custom React hooks
- `src/lib/`: Utility functions

## Accessibility Features

- High contrast UI elements
- Proper ARIA labels and roles
- Keyboard navigation support
- Focus management
- Screen reader friendly content

## Performance Optimizations

- Minimized dependencies
- Component lazy loading
- Optimized assets
- Efficient state management
- Minimized re-renders

## License

MIT
