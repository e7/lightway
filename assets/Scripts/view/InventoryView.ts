import { _decorator, Component, Node, Graphics, Color, UITransform } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('InventoryView')
export class InventoryView extends Component {
    public graphics: Graphics | null = null;

    // 逻辑常量
    private readonly cols = 15;
    private readonly rows = 2;
    private readonly cellSize = 48;

    start() {
        this.graphics = this.getComponent(Graphics);
        this.drawGrid();
    }

    private drawGrid() {
        if (!this.graphics) return;
        const g = this.graphics;
        g.clear();

        // 设置线条均为 2 像素，颜色和主棋盘保持一致
        g.lineWidth = 2;
        g.strokeColor = new Color(255, 255, 255, 120);

        const boardWidth = this.cols * this.cellSize;   // 15 * 48 = 720
        const boardHeight = this.rows * this.cellSize;  // 2 * 48 = 96

        // 从 UITransform 获取锚点进行偏移适配
        const uiTransform = this.getComponent(UITransform);
        const anchorX = uiTransform ? uiTransform.anchorX : 0.5;
        const anchorY = uiTransform ? uiTransform.anchorY : 0.5;

        const startX = -boardWidth * anchorX;
        const startY = -boardHeight * anchorY;

        // 画 16 条垂直线 (i=0 到 i=15 为边缘及内部线)
        for (let i = 0; i <= this.cols; i++) {
            let x = startX + i * this.cellSize;
            g.moveTo(x, startY);
            g.lineTo(x, startY + boardHeight);
        }

        // 画 3 条水平线 (i=0 到 i=2)
        for (let i = 0; i <= this.rows; i++) {
            let y = startY + i * this.cellSize;
            g.moveTo(startX, y);
            g.lineTo(startX + boardWidth, y);
        }

        g.stroke();
    }
}


