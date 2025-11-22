/**
 * Icon Generator for PWA
 * Generates all required icons programmatically using Canvas API
 * Run this in the browser console to generate icons
 */

class IconGenerator {
  constructor() {
    this.sizes = [16, 32, 72, 96, 128, 144, 152, 180, 192, 384, 512];
    this.zombieEmoji = '🧟';
    this.baseColor = '#00ff00';
    this.bgColor = '#1a1a1a';
  }

  /**
   * Generate a single icon
   */
  generateIcon(size) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = this.bgColor;
    ctx.fillRect(0, 0, size, size);

    // Border with gradient
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, this.baseColor);
    gradient.addColorStop(1, '#009900');
    ctx.strokeStyle = gradient;
    ctx.lineWidth = Math.max(2, size / 32);
    ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, size - ctx.lineWidth, size - ctx.lineWidth);

    // Zombie emoji (centered)
    ctx.font = `${size * 0.6}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.zombieEmoji, size / 2, size / 2);

    // Glow effect
    ctx.shadowBlur = size / 10;
    ctx.shadowColor = this.baseColor;

    // Title for larger icons
    if (size >= 192) {
      ctx.font = `bold ${size * 0.08}px Arial`;
      ctx.fillStyle = this.baseColor;
      ctx.shadowBlur = size / 20;
      ctx.fillText('ZOMBIE', size / 2, size * 0.85);
      ctx.fillText('SURVIVAL', size / 2, size * 0.93);
    }

    return canvas;
  }

  /**
   * Generate favicon (special 16x16 simplified version)
   */
  generateFavicon() {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');

    // Simple green background
    ctx.fillStyle = this.bgColor;
    ctx.fillRect(0, 0, 16, 16);

    // Green border
    ctx.strokeStyle = this.baseColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(1, 1, 14, 14);

    // Zombie face (simplified)
    ctx.fillStyle = this.baseColor;
    ctx.fillRect(5, 5, 2, 2);  // Left eye
    ctx.fillRect(9, 5, 2, 2);  // Right eye
    ctx.fillRect(5, 10, 6, 1); // Mouth

    return canvas;
  }

  /**
   * Download a canvas as PNG
   */
  downloadCanvas(canvas, filename) {
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 'image/png');
  }

  /**
   * Generate all icons and download them
   */
  async generateAll() {
    console.log('🎨 Generating icons...');

    // Generate favicon
    const favicon = this.generateFavicon();
    this.downloadCanvas(favicon, 'favicon-16x16.png');
    console.log('✅ favicon-16x16.png');

    // Wait a bit between downloads to avoid browser blocking
    const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // Generate all sizes
    for (const size of this.sizes) {
      await wait(100);
      const canvas = this.generateIcon(size);

      // Determine filename
      let filename;
      if (size === 16 || size === 32) {
        filename = `favicon-${size}x${size}.png`;
      } else if (size === 180) {
        filename = 'apple-touch-icon.png';
      } else if (size === 192 || size === 512) {
        filename = `android-chrome-${size}x${size}.png`;
      } else {
        filename = `icon-${size}x${size}.png`;
      }

      this.downloadCanvas(canvas, filename);
      console.log(`✅ ${filename}`);
    }

    console.log('🎉 All icons generated successfully!');
    console.log('📁 Save all downloaded files to /public/ folder');
  }

  /**
   * Generate and show preview
   */
  showPreview() {
    const container = document.createElement('div');
    container.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.95);
      padding: 30px;
      border-radius: 15px;
      border: 3px solid #00ff00;
      z-index: 10000;
      max-height: 80vh;
      overflow-y: auto;
    `;

    const title = document.createElement('h2');
    title.textContent = '🧟 Icon Preview';
    title.style.cssText = 'color: #00ff00; text-align: center; margin-bottom: 20px;';
    container.appendChild(title);

    const grid = document.createElement('div');
    grid.style.cssText = `
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
      gap: 15px;
      margin-bottom: 20px;
    `;

    [16, 32, 72, 96, 128, 192, 512].forEach(size => {
      const wrapper = document.createElement('div');
      wrapper.style.textAlign = 'center';

      const canvas = size === 16 ? this.generateFavicon() : this.generateIcon(size);
      canvas.style.cssText = `
        border: 2px solid #00ff00;
        border-radius: 8px;
        max-width: 100%;
        height: auto;
      `;

      const label = document.createElement('div');
      label.textContent = `${size}x${size}`;
      label.style.cssText = 'color: #00ff00; margin-top: 5px; font-size: 12px;';

      wrapper.appendChild(canvas);
      wrapper.appendChild(label);
      grid.appendChild(wrapper);
    });

    container.appendChild(grid);

    const btnContainer = document.createElement('div');
    btnContainer.style.cssText = 'display: flex; gap: 10px; justify-content: center;';

    const generateBtn = document.createElement('button');
    generateBtn.textContent = '📥 Generate & Download All';
    generateBtn.style.cssText = `
      background: linear-gradient(135deg, #00ff00, #00cc00);
      color: #000;
      border: none;
      padding: 15px 30px;
      font-size: 16px;
      font-weight: bold;
      border-radius: 8px;
      cursor: pointer;
    `;
    generateBtn.onclick = () => {
      this.generateAll();
      document.body.removeChild(container);
    };

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '❌ Close';
    closeBtn.style.cssText = `
      background: #ff0000;
      color: #fff;
      border: none;
      padding: 15px 30px;
      font-size: 16px;
      font-weight: bold;
      border-radius: 8px;
      cursor: pointer;
    `;
    closeBtn.onclick = () => document.body.removeChild(container);

    btnContainer.appendChild(generateBtn);
    btnContainer.appendChild(closeBtn);
    container.appendChild(btnContainer);

    document.body.appendChild(container);
  }
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  window.IconGenerator = IconGenerator;
  console.log('✅ IconGenerator loaded!');
  console.log('📝 Usage:');
  console.log('  const generator = new IconGenerator();');
  console.log('  generator.showPreview();  // Show preview and generate');
  console.log('  generator.generateAll();  // Generate all icons immediately');
}
