import { _decorator, Component, Node, Graphics, Color, UITransform, EventTouch, Vec2, v3, instantiate, director, Canvas } from 'cc';
import * as gc from '../logic/GridCell';
import { BoardView } from './BoardView';
const { ccclass, property } = _decorator;

@ccclass('InventoryView')
export class InventoryView extends Component {
    public graphics: Graphics | null = null;
    public boardView: BoardView | null = null;

    // 逻辑常量
    public readonly cols = 15;
    public readonly rows = 2;
    private readonly cellSize = 48;

    public grid: (gc.Item | null)[][] = [];
    public itemNodeMap: Map<gc.Item, Node> = new Map();

    private draggedItem: gc.Item | null = null;
    private draggedNode: Node | null = null;
    private dragStartCol: number = -1;
    private dragStartRow: number = -1;
    private dragHasMoved: boolean = false;

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

        const scene = director.getScene();
        if (scene) {
            const bView = scene.getComponentInChildren(BoardView);
            if (bView) {
                this.boardView = bView;
                this.boardView.inventoryView = this; // 主动关联
                if (this.boardView.getBoard()?.level) {
                    this.setItems(this.boardView.getBoard()!.level!.items);
                }
            }
        }

        this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
    }

    public setItems(items: gc.Item[]) {
        let i = 0;
        for (let y = 0; y < this.rows; y++) {
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
        let movedToBoard = false;

        if (this.dragHasMoved) {
            if (coord && coord.col >= 0 && coord.col < this.cols && coord.row >= 0 && coord.row < this.rows) {
                if (this.grid[coord.row][coord.col] === null) {
                    placedCol = coord.col;
                    placedRow = coord.row;
                }
            } else if (this.boardView && this.boardView.getBoard()) {
                const bView = this.boardView;
                const boardCoord = bView.getGridCoordFromGlobalPos(globalPos);
                const gridSize = bView.getGridSize();
                if (boardCoord && boardCoord.col >= 0 && boardCoord.col < gridSize && boardCoord.row >= 0 && boardCoord.row < gridSize) {
                    if (bView.getBoard()!.grid[boardCoord.row][boardCoord.col].item === null) {
                        movedToBoard = true;
                        bView.getBoard()!.grid[boardCoord.row][boardCoord.col].item = this.draggedItem;
                        let node = this.draggedNode;
                        // 这里不需要检查节点是否空，为了严谨最好检查下
                        if (node) {
                            this.itemNodeMap.delete(this.draggedItem);
                            bView.insertItemNode(this.draggedItem, node);
                        }
                    }
                }
            }
        } else {
            // 点击行为进行旋转
            const ref = this.draggedItem as any;
            if (typeof ref.direction !== 'undefined') {
                ref.direction = (ref.direction + 2) % 16 as gc.Direction;
            }
        }

        if (movedToBoard) {
            this.grid[this.dragStartRow][this.dragStartCol] = null;
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

    public insertItemNode(item: gc.Item, node: Node) {
        node.removeFromParent();
        this.node.addChild(node);
        this.itemNodeMap.set(item, node);
    }

    update(dt: number): void {
        this.drawGrid();

        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const item = this.grid[row][col];
                if (item) {
                    let itemNode = this.itemNodeMap.get(item);
                    if (!itemNode) {
                        itemNode = this.createNodeForItem(item);
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

    private createNodeForItem(item: gc.Item): Node | null {
        if (!this.boardView) return null;
        if (item.type === gc.IdReflector90) {
            const template = this.boardView.node.getChildByName("Reflector90");
            if (template) {
                const node = instantiate(template);
                node.active = true;
                return node;
            }
        } else if (item.type === gc.IdReflector45) {
            const template = this.boardView.node.getChildByName("Reflector45");
            if (template) {
                const node = instantiate(template);
                node.active = true;
                return node;
            }
        } else if (item.type === gc.IdGlassReflector) {
            const template = this.boardView.node.getChildByName("GlassReflector");
            if (template) {
                const node = instantiate(template);
                node.active = true;
                return node;
            }
        }
        return null;
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
