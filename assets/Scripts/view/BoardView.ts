import { _decorator, Component, Graphics, Color, UITransform, Node, Sprite, SpriteFrame, v3, instantiate, EventTouch, Vec2, director, Canvas } from 'cc';
import { Board } from '../logic/Board';
import * as gc from '../logic/GridCell';
import { ItemNodeFactory } from './ItemNodeFactory';
const { ccclass, property } = _decorator;

export const UIColors = {
    RED_LIGHT: new Color(255, 60, 60, 255),
    GREEN_LIGHT: new Color(60, 255, 80, 255),
    BLUE_LIGHT: new Color(60, 120, 255, 255),
    YELLOW_LIGHT: new Color(255, 255, 60, 255),
    CYAN_LIGHT: new Color(60, 255, 255, 255),
    MAGENTA_LIGHT: new Color(255, 60, 255, 255),
    WHITE_LIGHT: new Color(255, 255, 255, 255),

    RED_DARK: new Color(90, 30, 30, 255),
    GREEN_DARK: new Color(30, 90, 40, 255),
    BLUE_DARK: new Color(30, 50, 100, 255),
    YELLOW_DARK: new Color(90, 90, 30, 255),
    CYAN_DARK: new Color(30, 90, 90, 255),
    MAGENTA_DARK: new Color(90, 30, 90, 255),
    WHITE_DARK: new Color(100, 100, 100, 255)
};

@ccclass('BoardView')
export class BoardView extends Component {
    public graphics: Graphics | null = null;

    private board: Board | null = null;
    private factory: ItemNodeFactory | null = null;

    // 逻辑常量
    private readonly gridSize = 15;
    private readonly cellSize = 48;

    // 增加一个字典：核心道具对象 -> 对应的UI节点，防止每帧重复克隆
    private itemNodeMap: Map<gc.Item, Node> = new Map();

    private draggedItem: gc.Item | null = null;
    private draggedNode: Node | null = null;
    private dragStartCol: number = -1;
    private dragStartRow: number = -1;
    private dragHasMoved: boolean = false;

    /** 当道具被拖拽到棋盘外部时触发，由 GameController 设置 */
    public onItemDroppedOutside?: (item: gc.Item, node: Node, globalPos: Vec2) => void;

    start() {
        this.graphics = this.getComponent(Graphics);

        // 注册触摸/滑动事件监听，用于道具拖拽与旋转
        this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
    }

    /**
     * 由 GameController 调用，传入 Board 和 ItemNodeFactory
     */
    public init(board: Board, factory: ItemNodeFactory) {
        this.board = board;
        this.factory = factory;
    }

    public getGridCoordFromGlobalPos(globalPos: Vec2) {
        const uiTransform = this.getComponent(UITransform);
        if (!uiTransform) return null;

        // 转换到节点局部中心坐标
        const nodePos = uiTransform.convertToNodeSpaceAR(v3(globalPos.x, globalPos.y, 0));

        const boardWidth = this.gridSize * this.cellSize;
        const boardHeight = this.gridSize * this.cellSize;
        const anchorX = uiTransform.anchorX;
        const anchorY = uiTransform.anchorY;

        const startX = -boardWidth * anchorX;
        const startY = -boardHeight * anchorY;

        const localX = nodePos.x - startX;
        const localY = nodePos.y - startY;

        const col = Math.floor(localX / this.cellSize);
        const row = Math.floor(localY / this.cellSize);

        return { col, row, nodePos };
    }

    private getTopmostParent(): Node | null {
        const canvasComp = director.getScene()?.getComponentInChildren(Canvas);
        if (canvasComp) return canvasComp.node;
        return this.node.parent;
    }

    private onTouchStart(event: EventTouch) {
        if (!this.board) return;
        const globalPos = event.getUILocation();
        const coord = this.getGridCoordFromGlobalPos(globalPos);
        if (!coord) return;
        const { col, row } = coord;

        this.dragHasMoved = false;

        if (col >= 0 && col < this.gridSize && row >= 0 && row < this.gridSize) {
            const cell = this.board.grid[row][col];
            if (cell && cell.item) {
                const type = cell.item.type;
                // 只有镜子类是可移动的，小灯和光源锁定不可拖动
                if (type === gc.IdReflector90 || type === gc.IdReflector45 || type === gc.IdGlassReflector) {
                    this.draggedItem = cell.item;
                    this.draggedNode = this.itemNodeMap.get(cell.item) || null;
                    if (this.draggedNode) {
                        const topParent = this.getTopmostParent();
                        if (topParent) {
                            const wPos = this.draggedNode.worldPosition.clone();
                            this.draggedNode.removeFromParent();
                            topParent.addChild(this.draggedNode);
                            this.draggedNode.worldPosition = wPos;
                            // 拖拽时提到最上层
                            this.draggedNode.setSiblingIndex(topParent.children.length - 1);
                        }
                    }
                    this.dragStartCol = col;
                    this.dragStartRow = row;
                }
            }
        }
    }

    private onTouchMove(event: EventTouch) {
        if (!this.draggedNode) return;
        const delta = event.getDelta();
        if (delta.x * delta.x + delta.y * delta.y > 9) {
            this.dragHasMoved = true;
        }

        const globalPos = event.getUILocation();
        const topParent = this.getTopmostParent();
        if (topParent) {
            const uiTrans = topParent.getComponent(UITransform);
            if (uiTrans) {
                const nodePos = uiTrans.convertToNodeSpaceAR(v3(globalPos.x, globalPos.y, 0));
                this.draggedNode.setPosition(nodePos);
            }
        }
    }

    private onTouchEnd(event: EventTouch) {
        this.handleTouchDrop(event);
    }

    private onTouchCancel(event: EventTouch) {
        this.handleTouchDrop(event);
    }

    private handleTouchDrop(event: EventTouch) {
        if (!this.board || !this.draggedItem) return;

        const globalPos = event.getUILocation();
        const coord = this.getGridCoordFromGlobalPos(globalPos);

        let placedCol = this.dragStartCol;
        let placedRow = this.dragStartRow;
        let droppedOutside = false;

        if (this.dragHasMoved) {
            if (coord && coord.col >= 0 && coord.col < this.gridSize && coord.row >= 0 && coord.row < this.gridSize) {
                const targetCell = this.board.grid[coord.row][coord.col];
                // 如果目标网格为空地，就可以放置
                if (targetCell.item === null) {
                    placedCol = coord.col;
                    placedRow = coord.row;
                }
            } else {
                // 拖到棋盘外部 → 通过回调通知 GameController
                droppedOutside = true;
            }
        } else {
            // 没有发生拖拽位移，视作"点击"来旋转道具
            const ref = this.draggedItem as any;
            if (typeof ref.direction !== 'undefined') {
                ref.direction = (ref.direction + 2) % 16 as gc.Direction;
            }
        }

        if (droppedOutside) {
            // 从棋盘格清除道具
            this.board.grid[this.dragStartRow][this.dragStartCol].item = null;
            this.itemNodeMap.delete(this.draggedItem);
            // 通知外部处理（GameController 会决定放到 InventoryView 还是退回）
            if (this.onItemDroppedOutside && this.draggedNode) {
                this.onItemDroppedOutside(this.draggedItem, this.draggedNode, globalPos);
            }
        } else {
            // 原格子置空
            this.board.grid[this.dragStartRow][this.dragStartCol].item = null;
            // 道具放回棋盘指定格子
            this.board.grid[placedRow][placedCol].item = this.draggedItem;
            // 将道具重新塞回当前视图麾下
            if (this.draggedNode && this.draggedItem) {
                this.insertItemNode(this.draggedItem, this.draggedNode);
            }
        }

        // 结束拖拽清理引用
        this.draggedItem = null;
        this.draggedNode = null;
    }

    /**
     * 将道具节点挂载到 BoardView 并记录映射
     */
    public insertItemNode(item: gc.Item, node: Node) {
        node.removeFromParent();
        this.node.addChild(node);
        this.itemNodeMap.set(item, node);
    }

    /**
     * 从外部（如 InventoryView）放置道具到棋盘指定格子
     */
    public placeItemFromOutside(item: gc.Item, node: Node, col: number, row: number) {
        if (!this.board) return;
        this.board.grid[row][col].item = item;
        this.insertItemNode(item, node);
    }

    public getBoard() {
        return this.board;
    }

    public getGridSize() {
        return this.gridSize;
    }

    update(dt: number): void {
        // 绘制背景网格
        this.drawGrid();

        // 逻辑渲染前，必须清空上一帧残留的光线数据！
        this.board.clearRayPath();
        this.board.render();

        // 绘制
        this.board.grid.forEach((row: gc.GridCell[], idxRow: number) => {
            row.forEach((cell: gc.GridCell, idxColum: number) => {
                // 小灯在最底层，所以小灯最先画
                if (cell.item && cell.item.type === gc.IdLittleLight) {
                    const littleLight = cell.item as gc.LittleLight;
                    const uiColor = this.getUIColor(littleLight.color, littleLight.on);
                    this.drawCircle(idxColum, idxRow, uiColor);
                }

                // 绘制光线（盖在小灯的上方，但在极光发射器、镜子等道具下方）
                // 采用纯数据驱动：直接遍历 halfColors 数组进行绘制
                for (let d = 0; d < 16; d++) {
                    const color = cell.halfColors[d];
                    if (color && !color.equals(gc.Color.Black)) {
                        this.drawRayInCell(idxColum, idxRow, d as gc.Direction, this.getUIColor(color, true));
                    }
                }

                // 绘制道具
                if (cell.item === null) {
                    return;
                }
                switch (cell.item.type) {
                    case gc.IdRaySource:
                        const raySource = cell.item as gc.RaySource;

                        // 动态克隆节点逻辑
                        let srcNode = this.itemNodeMap.get(cell.item);
                        if (!srcNode && this.factory) {
                            srcNode = this.factory.createNode(cell.item);
                            if (srcNode) {
                                this.node.addChild(srcNode);
                                this.itemNodeMap.set(cell.item, srcNode);
                            }
                        }

                        if (srcNode) {
                            this.setNodeToCell(srcNode, idxColum, idxRow);
                            srcNode.angle = raySource.direction * 22.5;
                        }
                        break;
                    case gc.IdReflector45: {
                        const reflector45 = cell.item as gc.Reflector45;
                        // 光线已通过 halfColors 统一绘制，此处仅处理道具节点
                        let ref45Node = this.itemNodeMap.get(cell.item);
                        if (!ref45Node && this.factory) {
                            ref45Node = this.factory.createNode(cell.item);
                            if (ref45Node) {
                                this.node.addChild(ref45Node);
                                this.itemNodeMap.set(cell.item, ref45Node);
                            }
                        }
                        if (ref45Node && this.draggedItem !== cell.item) {
                            this.setNodeToCell(ref45Node, idxColum, idxRow);
                            ref45Node.angle = reflector45.direction * 22.5;
                        }
                        break;
                    }
                    case gc.IdReflector90: {
                        const reflector90 = cell.item as gc.Reflector90;
                        let ref90Node = this.itemNodeMap.get(cell.item);
                        if (!ref90Node && this.factory) {
                            ref90Node = this.factory.createNode(cell.item);
                            if (ref90Node) {
                                this.node.addChild(ref90Node);
                                this.itemNodeMap.set(cell.item, ref90Node);
                            }
                        }

                        // 如果这个道具正在被拖拽，将不会强制锁定到网格中心，从而让 `onTouchMove` 控制其跟随手指
                        if (ref90Node && this.draggedItem !== cell.item) {
                            this.setNodeToCell(ref90Node, idxColum, idxRow);
                            ref90Node.angle = reflector90.direction * 22.5;
                        }
                        break;
                    }
                    case gc.IdGlassReflector: {
                        // 玻璃镜逻辑同上，光线已由 halfColors 绘制
                        let glassNode = this.itemNodeMap.get(cell.item);
                        if (!glassNode && this.factory) {
                            glassNode = this.factory.createNode(cell.item);
                            if (glassNode) {
                                this.node.addChild(glassNode);
                                this.itemNodeMap.set(cell.item, glassNode);
                            }
                        }
                        if (glassNode && this.draggedItem !== cell.item) {
                            this.setNodeToCell(glassNode, idxColum, idxRow);
                            const glass = cell.item as gc.GlassReflector;
                            glassNode.angle = glass.direction * 22.5;
                        }
                        break;
                    }
                }
            })
        });
    }

    private drawGrid() {
        const g = this.graphics;
        if (!g) return;
        g.clear();

        const boardWidth = this.gridSize * this.cellSize;   // 15 * 48 = 720
        const boardHeight = this.gridSize * this.cellSize;  // 15 * 48 = 720

        // 从 UITransform 获取锚点进行偏移适配
        const uiTransform = this.getComponent(UITransform);
        const anchorX = uiTransform ? uiTransform.anchorX : 0.5;
        const anchorY = uiTransform ? uiTransform.anchorY : 0.5;

        const startX = -boardWidth * anchorX;
        const startY = -boardHeight * anchorY;

        // 1. 绘制带有区分度的深色背景底板，采用中性暗灰色(Dark Gray)，避免和所有霓虹色发生冲突，特别是蓝色
        g.fillColor = new Color(20, 24, 38, 255);
        g.rect(startX, startY, boardWidth, boardHeight);
        g.fill();

        // 2. 设置网格线
        g.lineWidth = 2;
        g.strokeColor = new Color(255, 255, 255, 80);

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
     * 将逻辑层的 Color 转换为 UI 渲染用的 cc.Color
     */
    private getUIColor(logicColor: gc.Color, isLight: boolean): Color {
        if (logicColor.equals(gc.Color.Red)) return isLight ? UIColors.RED_LIGHT : UIColors.RED_DARK;
        if (logicColor.equals(gc.Color.Green)) return isLight ? UIColors.GREEN_LIGHT : UIColors.GREEN_DARK;
        if (logicColor.equals(gc.Color.Blue)) return isLight ? UIColors.BLUE_LIGHT : UIColors.BLUE_DARK;
        if (logicColor.equals(gc.Color.Yellow)) return isLight ? UIColors.YELLOW_LIGHT : UIColors.YELLOW_DARK;
        if (logicColor.equals(gc.Color.Cyan)) return isLight ? UIColors.CYAN_LIGHT : UIColors.CYAN_DARK;
        if (logicColor.equals(gc.Color.Magenta)) return isLight ? UIColors.MAGENTA_LIGHT : UIColors.MAGENTA_DARK;

        return isLight ? UIColors.WHITE_LIGHT : UIColors.WHITE_DARK;
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

        // 3. 计算坐标并设置节点的位置
        const pos = this.getCellCenterPosition(col, row);
        spriteNode.setPosition(pos);

        // 4. 将节点添加到当前棋盘节点下
        this.node.addChild(spriteNode);

        return spriteNode;
    }
}
