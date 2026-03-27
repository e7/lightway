import { _decorator, Component, Node, Graphics, Color, UITransform, EventTouch, Vec2, v3, director, Canvas } from 'cc';
import * as gc from '../logic/GridCell';
import { ItemNodeFactory } from './ItemNodeFactory';
const { ccclass, property } = _decorator;

@ccclass('InventoryView')
export class InventoryView extends Component {
    public graphics: Graphics | null = null;

    // 逻辑常量
    public readonly cols = 15;
    public readonly rows = 2;
    private readonly cellSize = 48;

    public grid: (gc.Item | null)[][] = [];
    public itemNodeMap: Map<gc.Item, Node> = new Map();

    private factory: ItemNodeFactory | null = null;

    private draggedItem: gc.Item | null = null;
    private draggedNode: Node | null = null;
    private dragStartCol: number = -1;
    private dragStartRow: number = -1;
    private dragHasMoved: boolean = false;

    /** 当道具被拖拽到 Inventory 外部时触发，由 GameController 设置 */
    public onItemDroppedOutside?: (item: gc.Item, node: Node, globalPos: Vec2) => void;

    onLoad() {
        for (let y = 0; y < this.rows; y++) {
            this.grid[y] = [];
            for (let x = 0; x < this.cols; x++) {
                this.grid[y][x] = null;
            }
        }
    }

    start() {
        this.graphics = this.getComponent(Graphics);
        this.drawGrid();

        this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
    }

    /**
     * 由 GameController 调用，传入道具列表和工厂
     */
    public init(items: gc.Item[], factory: ItemNodeFactory) {
        this.factory = factory;
        this.setItems(items);
    }

    public setItems(items: gc.Item[]) {
        let i = 0;
        // 倒序遍历行：从 top (row=1) 开始放置，然后是 bottom (row=0)
        for (let y = this.rows - 1; y >= 0; y--) {
            for (let x = 0; x < this.cols; x++) {
                if (i < items.length) {
                    this.grid[y][x] = items[i];
                    i++;
                } else {
                    this.grid[y][x] = null;
                }
            }
        }
    }

    public getGridCoordFromGlobalPos(globalPos: Vec2) {
        const uiTransform = this.getComponent(UITransform);
        if (!uiTransform) return null;
        const nodePos = uiTransform.convertToNodeSpaceAR(v3(globalPos.x, globalPos.y, 0));

        const boardWidth = this.cols * this.cellSize;
        const boardHeight = this.rows * this.cellSize;
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
        const globalPos = event.getUILocation();
        const coord = this.getGridCoordFromGlobalPos(globalPos);
        if (!coord) return;
        const { col, row } = coord;

        this.dragHasMoved = false;

        if (col >= 0 && col < this.cols && row >= 0 && row < this.rows) {
            const item = this.grid[row][col];
            if (item) {
                this.draggedItem = item;
                this.draggedNode = this.itemNodeMap.get(item) || null;
                if (this.draggedNode) {
                    const topParent = this.getTopmostParent();
                    if (topParent) {
                        const wPos = this.draggedNode.worldPosition.clone();
                        this.draggedNode.removeFromParent();
                        topParent.addChild(this.draggedNode);
                        this.draggedNode.worldPosition = wPos;
                        this.draggedNode.setSiblingIndex(topParent.children.length - 1);
                    }
                }
                this.dragStartCol = col;
                this.dragStartRow = row;
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
        if (!this.draggedItem) return;

        const globalPos = event.getUILocation();
        const coord = this.getGridCoordFromGlobalPos(globalPos);

        let placedCol = this.dragStartCol;
        let placedRow = this.dragStartRow;
        let droppedOutside = false;

        if (this.dragHasMoved) {
            if (coord && coord.col >= 0 && coord.col < this.cols && coord.row >= 0 && coord.row < this.rows) {
                if (this.grid[coord.row][coord.col] === null) {
                    placedCol = coord.col;
                    placedRow = coord.row;
                }
            } else {
                // 拖到 Inventory 外部 → 通过回调通知 GameController
                droppedOutside = true;
            }
        } else {
            // 点击行为进行旋转
            const ref = this.draggedItem as any;
            if (typeof ref.direction !== 'undefined') {
                ref.direction = (ref.direction + 2) % 16 as gc.Direction;
            }
        }

        if (droppedOutside) {
            // 从 Inventory 格子清除道具
            this.grid[this.dragStartRow][this.dragStartCol] = null;
            this.itemNodeMap.delete(this.draggedItem);
            // 通知外部处理（GameController 会决定放到 BoardView 还是退回）
            if (this.onItemDroppedOutside && this.draggedNode) {
                this.onItemDroppedOutside(this.draggedItem, this.draggedNode, globalPos);
            }
        } else {
            this.grid[this.dragStartRow][this.dragStartCol] = null;
            this.grid[placedRow][placedCol] = this.draggedItem;
            // 重新挂回 InventoryView
            if (this.draggedNode && this.draggedItem) {
                this.insertItemNode(this.draggedItem, this.draggedNode);
            }
        }

        this.draggedItem = null;
        this.draggedNode = null;
    }

    /**
     * 将道具节点挂载到 InventoryView 并记录映射
     */
    public insertItemNode(item: gc.Item, node: Node) {
        node.removeFromParent();
        this.node.addChild(node);
        this.itemNodeMap.set(item, node);
    }

    /**
     * 从外部（如 BoardView）放置道具到 Inventory 的空位
     * 自动寻找第一个空格子
     */
    public placeItemFromOutside(item: gc.Item, node: Node) {
        // 找第一个空位：优先从 top (row=1) 开始搜索
        for (let y = this.rows - 1; y >= 0; y--) {
            for (let x = 0; x < this.cols; x++) {
                if (this.grid[y][x] === null) {
                    this.grid[y][x] = item;
                    this.insertItemNode(item, node);
                    return;
                }
            }
        }
        // 如果没有空位，仍然尝试放到顶排第一个 (col=0, row=1)
        this.grid[this.rows - 1][0] = item;
        this.insertItemNode(item, node);
    }

    /**
     * 尝试将道具放置到 Inventory 指定格子
     * @returns 是否放置成功
     */
    public placeItemAt(item: gc.Item, node: Node, col: number, row: number): boolean {
        if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return false;
        if (this.grid[row][col] !== null) return false;
        this.grid[row][col] = item;
        this.insertItemNode(item, node);
        return true;
    }

    update(dt: number): void {
        this.drawGrid();

        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const item = this.grid[row][col];
                if (item) {
                    let itemNode = this.itemNodeMap.get(item);
                    if (!itemNode && this.factory) {
                        itemNode = this.factory.createNode(item);
                        if (itemNode) {
                            this.node.addChild(itemNode);
                            this.itemNodeMap.set(item, itemNode);
                        }
                    }

                    if (itemNode && this.draggedItem !== item) {
                        this.setNodeToCell(itemNode, col, row);
                        const ref = item as any;
                        if (typeof ref.direction !== 'undefined') {
                            itemNode.angle = ref.direction * 22.5;
                        }
                    }
                }
            }
        }
    }

    public getCellCenterPosition(col: number, row: number) {
        const boardWidth = this.cols * this.cellSize;
        const boardHeight = this.rows * this.cellSize;

        const uiTransform = this.getComponent(UITransform);
        const anchorX = uiTransform ? uiTransform.anchorX : 0.5;
        const anchorY = uiTransform ? uiTransform.anchorY : 0.5;

        const startX = -boardWidth * anchorX;
        const startY = -boardHeight * anchorY;

        const centerX = startX + col * this.cellSize + this.cellSize / 2;
        const centerY = startY + row * this.cellSize + this.cellSize / 2;

        return v3(centerX, centerY, 0);
    }

    public setNodeToCell(node: Node, col: number, row: number) {
        if (!node) return;
        const pos = this.getCellCenterPosition(col, row);
        node.setPosition(pos);
    }

    private drawGrid() {
        if (!this.graphics) return;
        const g = this.graphics;
        g.clear();

        const boardWidth = this.cols * this.cellSize;   // 15 * 48 = 720
        const boardHeight = this.rows * this.cellSize;  // 2 * 48 = 96

        // 从 UITransform 获取锚点进行偏移适配
        const uiTransform = this.getComponent(UITransform);
        const anchorX = uiTransform ? uiTransform.anchorX : 0.5;
        const anchorY = uiTransform ? uiTransform.anchorY : 0.5;

        const startX = -boardWidth * anchorX;
        const startY = -boardHeight * anchorY;

        // 1. 绘制带有区分度的深色背景底板，保持与主棋盘的色调统一
        g.fillColor = new Color(20, 24, 38, 255);
        g.rect(startX, startY, boardWidth, boardHeight);
        g.fill();

        // 2. 设置线条均为 2 像素，颜色和主棋盘保持一致
        g.lineWidth = 2;
        g.strokeColor = new Color(255, 255, 255, 80);

        // 画垂直线 (i=0 到 i=cols)
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
