import { _decorator, Component, Node, Vec2, director } from 'cc';
import { Board, Level } from '../logic/Board';
import * as gc from '../logic/GridCell';
import { BoardView } from './BoardView';
import { InventoryView } from './InventoryView';
import { ItemNodeFactory } from './ItemNodeFactory';
const { ccclass, property } = _decorator;

/**
 * GameController —— 中介者 (Mediator)
 * 负责创建 Board、加载关卡、管理道具模板、协调 BoardView 与 InventoryView 之间的跨区域拖拽。
 */
@ccclass('GameController')
export class GameController extends Component {
    private boardView: BoardView | null = null;
    private inventoryView: InventoryView | null = null;
    private board: Board | null = null;
    private factory: ItemNodeFactory = new ItemNodeFactory();

    // 道具模板名称列表，与 BoardView 节点下的子节点名称一一对应
    private static readonly TEMPLATE_NAMES = [
        'RaySourceRed', 'RaySourceGreen', 'RaySourceBlue',
        'RaySourceYellow', 'RaySourceCyan', 'RaySourceMagenta', 'RaySourceWhite',
        'Reflector90', 'Reflector45', 'GlassReflector',
    ];

    start() {
        const scene = director.getScene();
        if (!scene) return;

        // 查找 View 组件
        this.boardView = scene.getComponentInChildren(BoardView);
        this.inventoryView = scene.getComponentInChildren(InventoryView);

        if (!this.boardView) {
            console.error('GameController: BoardView not found in scene!');
            return;
        }

        // 从 BoardView 节点下收集道具模板，注册到工厂
        for (const name of GameController.TEMPLATE_NAMES) {
            const tpl = this.boardView.node.getChildByName(name);
            if (tpl) {
                this.factory.registerTemplate(name, tpl);
            }
        }

        // 创建 Board 并加载关卡
        this.board = new Board(15);
        this.board.load({
            staticItems: [
                { x: 0, y: 11, item: { type: gc.IdRaySource, direction: gc.Dir7PI_4, color: gc.Color.Blue } as gc.RaySource },
                { x: 3, y: 0, item: { type: gc.IdRaySource, direction: gc.DirPI_4, color: gc.Color.Green } as gc.RaySource },
                { x: 14, y: 3, item: { type: gc.IdRaySource, direction: gc.DirPI, color: gc.Color.Red } as gc.RaySource },
                { x: 7, y: 6, item: { type: gc.IdLittleLight, color: gc.Color.Magenta, on: false } as gc.LittleLight },
                { x: 9, y: 8, item: { type: gc.IdLittleLight, color: gc.Color.Cyan, on: false } as gc.LittleLight },
                { x: 7, y: 10, item: { type: gc.IdLittleLight, color: gc.Color.Yellow, on: false } as gc.LittleLight },
            ],
            items: [
                { type: gc.IdReflector90, direction: gc.Dir5PI_4 } as gc.Reflector90,
                { type: gc.IdReflector90, direction: gc.Dir5PI_4 } as gc.Reflector90,
                { type: gc.IdReflector90, direction: gc.Dir5PI_4 } as gc.Reflector90,
            ],
        });

        // 初始化 BoardView
        this.boardView.init(this.board, this.factory);

        // 初始化 InventoryView
        if (this.inventoryView && this.board.level) {
            this.inventoryView.init(this.board.level.items, this.factory);
        }

        // 注册跨区域拖拽回调
        this.setupCrossDropCallbacks();
    }

    private setupCrossDropCallbacks() {
        const bv = this.boardView!;
        const iv = this.inventoryView;

        // BoardView 道具拖出棋盘 → 尝试放入 InventoryView
        bv.onItemDroppedOutside = (item: gc.Item, node: Node, globalPos: Vec2) => {
            if (iv) {
                const invCoord = iv.getGridCoordFromGlobalPos(globalPos);
                if (invCoord && invCoord.col >= 0 && invCoord.col < iv.cols && invCoord.row >= 0 && invCoord.row < iv.rows) {
                    // 精确放到手指位置的格子
                    if (iv.placeItemAt(item, node, invCoord.col, invCoord.row)) {
                        return;
                    }
                }
                // 放不到精确位置，自动找空位
                iv.placeItemFromOutside(item, node);
            } else {
                // 没有 InventoryView，退回棋盘原位
                bv.placeItemFromOutside(item, node, 0, 0);
            }
        };

        // InventoryView 道具拖出 → 尝试放入 BoardView
        if (iv) {
            iv.onItemDroppedOutside = (item: gc.Item, node: Node, globalPos: Vec2) => {
                const boardCoord = bv.getGridCoordFromGlobalPos(globalPos);
                const gridSize = bv.getGridSize();
                if (boardCoord && boardCoord.col >= 0 && boardCoord.col < gridSize && boardCoord.row >= 0 && boardCoord.row < gridSize) {
                    const board = bv.getBoard();
                    if (board && board.grid[boardCoord.row][boardCoord.col].item === null) {
                        bv.placeItemFromOutside(item, node, boardCoord.col, boardCoord.row);
                        return;
                    }
                }
                // 放不到棋盘，退回 Inventory
                iv.placeItemFromOutside(item, node);
            };
        }
    }
}
