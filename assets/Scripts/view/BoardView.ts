import { _decorator, Component, Graphics, Color, UITransform } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('BoardView')
export class BoardView extends Component {
    // 允许在 Cocos 编辑器面板里直接关联 graphics 组件
    @property(Graphics)
    public graphics: Graphics | null = null;

    // 逻辑常量
    private readonly gridSize = 15;
    private readonly cellSize = 48;

    start() {
        // 游戏启动时：如果没有手动关联，就自动获取当前节点上挂载的 Graphics 组件
        if (!this.graphics) {
            this.graphics = this.getComponent(Graphics);
        }

        this.drawGrid();
    }

    private drawGrid() {
        if (!this.graphics) return;

        const g = this.graphics;
        g.clear();

        // 设置线条均为 2 像素
        g.lineWidth = 2;
        g.strokeColor = new Color(255, 255, 255, 120);

        const boardWidth = this.gridSize * this.cellSize;   // 15 * 48 = 720
        const boardHeight = this.gridSize * this.cellSize;  // 15 * 48 = 720

        // 从 UITransform 获取锚点进行偏移适配
        const uiTransform = this.getComponent(UITransform);
        const anchorX = uiTransform ? uiTransform.anchorX : 0.5;
        const anchorY = uiTransform ? uiTransform.anchorY : 0.5;

        const startX = -boardWidth * anchorX;
        const startY = -boardHeight * anchorY;

        // 画 16 条垂直线 (i=0 和 i=15 就是左右外框边缘)
        for (let i = 0; i <= this.gridSize; i++) {
            let x = startX + i * this.cellSize;

            g.moveTo(x, startY);
            g.lineTo(x, startY + boardHeight);
        }

        // 画 16 条水平线 (i=0 和 i=15 就是上下外框边缘)
        for (let i = 0; i <= this.gridSize; i++) {
            let y = startY + i * this.cellSize;

            g.moveTo(startX, y);
            g.lineTo(startX + boardWidth, y);
        }

        g.stroke();

        // 在 (0, 0) 格子上画一个红色的实心圆
        this.drawCircle(0, 0, new Color(202, 42, 6, 255)); // 柔和的红色

        // 在 (1, 2) 格子上画一个蓝色的实心圆
        this.drawCircle(1, 2, new Color(80, 180, 255, 255)); // 柔和的蓝色
    }

    /**
     * 在指定的棋盘格子上绘制实心圆
     * @param col 列索引 [0, gridSize)
     * @param row 行索引 [0, gridSize)
     * @param color 圆的填充颜色
     */
    public drawCircle(col: number, row: number, color: Color) {
        if (!this.graphics) return;

        // 重新计算起始坐标（避免耦合依赖）
        const boardWidth = this.gridSize * this.cellSize;
        const boardHeight = this.gridSize * this.cellSize;

        const uiTransform = this.getComponent(UITransform);
        const anchorX = uiTransform ? uiTransform.anchorX : 0.5;
        const anchorY = uiTransform ? uiTransform.anchorY : 0.5;

        const startX = -boardWidth * anchorX;
        const startY = -boardHeight * anchorY;

        // 计算单元格的中心点位置
        const centerX = startX + col * this.cellSize + this.cellSize / 2;
        const centerY = startY + row * this.cellSize + this.cellSize / 2;

        // 半径取单元格大小的 40%
        const radius = this.cellSize * 0.4;

        this.graphics.fillColor = color;
        this.graphics.circle(centerX, centerY, radius);
        this.graphics.fill();
    }
}
