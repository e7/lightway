import { _decorator, Component, Graphics, Color, UITransform, Node, Sprite, SpriteFrame, v3 } from 'cc';
import { Board } from '../logic/Board';
import * as gc from '../logic/GridCell';
const { ccclass, property } = _decorator;

export const LampColors = {
    // 亮灯颜色
    RED_ON: new Color(255, 60, 60, 255),
    GREEN_ON: new Color(60, 255, 80, 255),
    BLUE_ON: new Color(60, 120, 255, 255),
    WHITE_ON: new Color(255, 255, 255, 255),

    // 熄灯颜色
    RED_OFF: new Color(50, 10, 10, 255),
    GREEN_OFF: new Color(10, 50, 15, 255),
    BLUE_OFF: new Color(10, 25, 60, 255),
    WHITE_OFF: new Color(60, 60, 60, 255)
};

@ccclass('BoardView')
export class BoardView extends Component {
    public graphics: Graphics | null = null;

    private board: Board | null = null;

    // 逻辑常量
    private readonly gridSize = 15;
    private readonly cellSize = 48;

    private raySourceRed: Node | null = null;

    start() {
        this.graphics = this.getComponent(Graphics);
        this.raySourceRed = this.node.getChildByName("RaySourceRed");
        this.board = new Board(this.gridSize);
        this.board.load({
            staticItems: [
                { x: 7, y: 4, item: { type: gc.IdRaySource, direction: gc.DirPI_2, color: gc.Color.Red } as gc.RaySource },
                { x: 7, y: 7, item: { type: gc.IdLittleLight, color: gc.Color.Red, on: false } as gc.LittleLight },
            ],
            items: [],
        });
    }

    update(dt: number): void {
        this.drawGrid();

        // 逻辑渲染
        this.board.render();

        // 绘制
        this.board.grid.forEach((row: gc.GridCell[], idxRow: number) => {
            row.forEach((cell: gc.GridCell, idxColum: number) => {
                // 绘制光线
                cell.rays.forEach((ray: gc.Ray) => {
                    this.drawRayInCell(idxColum, idxRow, ray.direction, LampColors.RED_ON);
                });

                // 绘制道具
                if (cell.item === null) {
                    return;
                }
                switch (cell.item.type) {
                    case gc.IdRaySource:
                        const raySource = cell.item as gc.RaySource;
                        this.setNodeToCell(this.raySourceRed, idxColum, idxRow);
                        this.raySourceRed.active = true;
                        break;
                    case gc.IdLittleLight:
                        const littleLight = cell.item as gc.LittleLight;
                        if (littleLight.on) {
                            this.drawCircle(idxColum, idxRow, LampColors.RED_ON);
                        } else {
                            this.drawCircle(idxColum, idxRow, LampColors.RED_OFF);
                        }
                        // 再绘制一次光线，保证光线在灯的上面
                        cell.rays.forEach((ray: gc.Ray) => {
                            this.drawRayInCell(idxColum, idxRow, ray.direction, LampColors.GREEN_ON);
                        });
                        break;
                    case gc.IdReflector45:
                        break;
                    case gc.IdReflector90:
                        break;
                }
            })
        })
    }

    private drawGrid() {
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
    }

    /**
     * 计算指定格子的中心点坐标
     */
    public getCellCenterPosition(col: number, row: number) {
        const boardWidth = this.gridSize * this.cellSize;
        const boardHeight = this.gridSize * this.cellSize;

        const uiTransform = this.getComponent(UITransform);
        const anchorX = uiTransform ? uiTransform.anchorX : 0.5;
        const anchorY = uiTransform ? uiTransform.anchorY : 0.5;

        const startX = -boardWidth * anchorX;
        const startY = -boardHeight * anchorY;

        const centerX = startX + col * this.cellSize + this.cellSize / 2;
        const centerY = startY + row * this.cellSize + this.cellSize / 2;

        return v3(centerX, centerY, 0);
    }

    /**
     * 将指定节点的位置放置到网格的中心坐标
     * @param node 需要移动的节点
     * @param col 列索引 [0, gridSize)
     * @param row 行索引 [0, gridSize)
     */
    public setNodeToCell(node: Node, col: number, row: number) {
        if (!node) return;

        // 获取方格中心坐标
        const pos = this.getCellCenterPosition(col, row);

        // 设置节点的新位置
        node.setPosition(pos);
    }

    /**
     * 在指定的棋盘格子上绘制实心圆 (Graphics 矢量图)
     * @param col 列索引 [0, gridSize)
     * @param row 行索引 [0, gridSize)
     * @param color 圆的填充颜色
     */
    public drawCircle(col: number, row: number, color: Color) {
        if (!this.graphics) return;

        const pos = this.getCellCenterPosition(col, row);

        // 半径取单元格大小的 25%，作为灯的尺寸比较适中
        const radius = this.cellSize * 0.25;

        this.graphics.fillColor = color;
        this.graphics.circle(pos.x, pos.y, radius);
        this.graphics.fill();
    }

    /**
     * 在网格内绘制从网格中心发射的光线段
     * @param col 列索引 [0, gridSize)
     * @param row 行索引 [0, gridSize)
     * @param dir 光线的方向 (使用逻辑层 gc 的方向定义)
     * @param color 渲染光线的颜色
     */
    public drawRayInCell(col: number, row: number, dir: gc.Direction, color: Color) {
        if (!this.graphics) return;

        const pos = this.getCellCenterPosition(col, row);
        const half = this.cellSize / 2;

        let endX = pos.x;
        let endY = pos.y;

        switch (dir) {
            case gc.Dir0: endX += half; break;
            case gc.DirPI_4: endX += half; endY += half; break;
            case gc.DirPI_2: endY += half; break;
            case gc.Dir3PI_4: endX -= half; endY += half; break;
            case gc.DirPI: endX -= half; break;
            case gc.Dir5PI_4: endX -= half; endY -= half; break;
            case gc.Dir3PI_2: endY -= half; break;
            case gc.Dir7PI_4: endX += half; endY -= half; break;
        }

        const g = this.graphics;
        // 记录原本的状态
        const oldLineWidth = g.lineWidth;
        const oldStrokeColor = g.strokeColor.clone();

        g.strokeColor = color;
        g.lineWidth = 3; // 稍细一点，让灯泡显得更加显眼协调

        g.moveTo(pos.x, pos.y);
        g.lineTo(endX, endY);
        g.stroke();

        // 恢复原本状态
        g.lineWidth = oldLineWidth;
        g.strokeColor = oldStrokeColor;
    }

    /**
     * 在指定的棋盘格子上生成一个精灵节点
     * @param col 列索引 [0, gridSize)
     * @param row 行索引 [0, gridSize)
     * @param spriteFrame 精灵的纹理帧，比如在其他地方 load/获取 的贴图
     * @returns 返回创建的节点，便于后续做动画或状态管理
     */
    public drawSprite(col: number, row: number, spriteFrame: SpriteFrame): Node {
        // 1. 创建一个新的节点
        const spriteNode = new Node(`Sprite_${col}_${row}`);

        // 2. 添加 Sprite 组件并设置图片帧
        const spriteComp = spriteNode.addComponent(Sprite);
        spriteComp.spriteFrame = spriteFrame;

        // 可选：如果要统一缩放确保精灵不超出格子，可以获取它并限制尺寸
        // const uiTransform = spriteNode.getComponent(UITransform);
        // if (uiTransform) {
        //     uiTransform.setContentSize(this.cellSize, this.cellSize);
        // }

        // 3. 计算坐标并设置节点的位置
        const pos = this.getCellCenterPosition(col, row);
        spriteNode.setPosition(pos);

        // 4. 将节点添加到当前棋盘节点下
        this.node.addChild(spriteNode);

        return spriteNode;
    }
}
