/**
 * Tests for OptimizedImage component
 * Wrapper around Next.js Image with SVG handling
 */

import React from 'react';
import { render } from '@testing-library/react';
import OptimizedImage from '../../components/OptimizedImage';

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} data-testid="next-image" />;
  },
}));

describe('OptimizedImage', () => {
  const defaultProps = {
    src: '/test-image.png',
    alt: 'Test Image',
    width: 100,
    height: 100,
  };

  describe('Basic Rendering', () => {
    it('should render with required props', () => {
      const { getByTestId } = render(<OptimizedImage {...defaultProps} />);
      const image = getByTestId('next-image');

      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', '/test-image.png');
      expect(image).toHaveAttribute('alt', 'Test Image');
      expect(image).toHaveAttribute('width', '100');
      expect(image).toHaveAttribute('height', '100');
    });

    it('should apply custom className', () => {
      const { getByTestId } = render(
        <OptimizedImage {...defaultProps} className="custom-class" />
      );
      const image = getByTestId('next-image');

      expect(image).toHaveClass('custom-class');
    });

    it('should apply custom styles', () => {
      const customStyle = { border: '1px solid red', padding: '10px' };
      const { getByTestId } = render(
        <OptimizedImage {...defaultProps} style={customStyle} />
      );
      const image = getByTestId('next-image');

      expect(image).toHaveStyle({ border: '1px solid red', padding: '10px' });
    });
  });

  describe('SVG Handling', () => {
    it('should render SVG images', () => {
      const { getByTestId } = render(
        <OptimizedImage
          src="/icons/test-icon.svg"
          alt="SVG Icon"
          width={24}
          height={24}
        />
      );
      const image = getByTestId('next-image');

      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', '/icons/test-icon.svg');
    });

    it('should render non-SVG images', () => {
      const { getByTestId } = render(<OptimizedImage {...defaultProps} />);
      const image = getByTestId('next-image');

      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', '/test-image.png');
    });

    it('should handle SVG with various cases', () => {
      const svgPaths = [
        '/icons/test.svg',
        '/icons/test.SVG',
        '/weather-icons/sunny.svg',
      ];

      svgPaths.forEach(src => {
        const { getByTestId, unmount } = render(
          <OptimizedImage
            src={src}
            alt="Test SVG"
            width={24}
            height={24}
          />
        );
        const image = getByTestId('next-image');

        expect(image).toHaveAttribute('src', src);
        unmount();
      });
    });
  });

  describe('External Images', () => {
    it('should handle HTTP URLs', () => {
      const { getByTestId } = render(
        <OptimizedImage
          src="http://example.com/image.png"
          alt="External Image"
          width={200}
          height={150}
        />
      );
      const image = getByTestId('next-image');

      expect(image).toHaveAttribute('src', 'http://example.com/image.png');
    });

    it('should handle HTTPS URLs', () => {
      const { getByTestId } = render(
        <OptimizedImage
          src="https://example.com/secure-image.jpg"
          alt="Secure External Image"
          width={300}
          height={200}
        />
      );
      const image = getByTestId('next-image');

      expect(image).toHaveAttribute('src', 'https://example.com/secure-image.jpg');
    });
  });

  describe('Loading Behavior', () => {
    it('should default to lazy loading', () => {
      const { getByTestId } = render(<OptimizedImage {...defaultProps} />);
      const image = getByTestId('next-image');

      expect(image).toHaveAttribute('loading', 'lazy');
    });

    it('should support eager loading when specified', () => {
      const { getByTestId } = render(
        <OptimizedImage {...defaultProps} loading="eager" />
      );
      const image = getByTestId('next-image');

      expect(image).toHaveAttribute('loading', 'eager');
    });
  });

  describe('Local Images', () => {
    it('should handle images from public directory', () => {
      const { getByTestId } = render(
        <OptimizedImage
          src="/weather-icons/sunny.png"
          alt="Sunny Weather"
          width={64}
          height={64}
        />
      );
      const image = getByTestId('next-image');

      expect(image).toHaveAttribute('src', '/weather-icons/sunny.png');
    });

    it('should handle images with various file extensions', () => {
      const extensions = ['jpg', 'jpeg', 'png', 'webp', 'gif'];

      extensions.forEach(ext => {
        const { getByTestId, unmount } = render(
          <OptimizedImage
            src={`/images/test.${ext}`}
            alt={`Test ${ext.toUpperCase()}`}
            width={100}
            height={100}
          />
        );
        const image = getByTestId('next-image');

        expect(image).toHaveAttribute('src', `/images/test.${ext}`);
        unmount();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty className', () => {
      const { getByTestId } = render(
        <OptimizedImage {...defaultProps} className="" />
      );
      const image = getByTestId('next-image');

      expect(image).toBeInTheDocument();
    });

    it('should handle empty style object', () => {
      const { getByTestId } = render(
        <OptimizedImage {...defaultProps} style={{}} />
      );
      const image = getByTestId('next-image');

      expect(image).toBeInTheDocument();
    });

    it('should handle very large dimensions', () => {
      const { getByTestId } = render(
        <OptimizedImage
          src="/large-image.png"
          alt="Large Image"
          width={5000}
          height={3000}
        />
      );
      const image = getByTestId('next-image');

      expect(image).toHaveAttribute('width', '5000');
      expect(image).toHaveAttribute('height', '3000');
    });

    it('should handle very small dimensions', () => {
      const { getByTestId } = render(
        <OptimizedImage
          src="/tiny-icon.png"
          alt="Tiny Icon"
          width={1}
          height={1}
        />
      );
      const image = getByTestId('next-image');

      expect(image).toHaveAttribute('width', '1');
      expect(image).toHaveAttribute('height', '1');
    });

    it('should handle images with query parameters', () => {
      const { getByTestId } = render(
        <OptimizedImage
          src="/image.png?v=123&size=large"
          alt="Image with params"
          width={200}
          height={200}
        />
      );
      const image = getByTestId('next-image');

      expect(image).toHaveAttribute('src', '/image.png?v=123&size=large');
    });

    it('should handle images with hash fragments', () => {
      const { getByTestId } = render(
        <OptimizedImage
          src="/image.png#section"
          alt="Image with hash"
          width={200}
          height={200}
        />
      );
      const image = getByTestId('next-image');

      expect(image).toHaveAttribute('src', '/image.png#section');
    });
  });

  describe('Accessibility', () => {
    it('should always have alt text', () => {
      const { getByTestId } = render(<OptimizedImage {...defaultProps} />);
      const image = getByTestId('next-image');

      expect(image).toHaveAttribute('alt');
      expect(image.getAttribute('alt')).toBeTruthy();
    });

    it('should support empty alt for decorative images', () => {
      const { getByTestId } = render(
        <OptimizedImage {...defaultProps} alt="" />
      );
      const image = getByTestId('next-image');

      expect(image).toHaveAttribute('alt', '');
    });

    it('should support descriptive alt text', () => {
      const { getByTestId } = render(
        <OptimizedImage
          {...defaultProps}
          alt="A beautiful sunset over the ocean with orange and pink clouds"
        />
      );
      const image = getByTestId('next-image');

      expect(image).toHaveAttribute('alt', 'A beautiful sunset over the ocean with orange and pink clouds');
    });
  });
});
