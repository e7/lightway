import { Node, instantiate } from 'cc';
import * as gc from '../logic/GridCell';

/**
 * 道具节点工厂 —— 集中管理道具模板，供 BoardView 和 InventoryView 通用。
 * 消除 InventoryView 对 BoardView 节点树的直接访问。
 */
export class ItemNodeFactory {
    private templates: Map<string, Node> = new Map();

    /**
     * 注册一个模板节点（模板节点自身保持 inactive，工厂只克隆它）
     */
    registerTemplate(name: string, node: Node): void {
        this.templates.set(name, node);
    }

    /**
     * 根据道具类型创建对应的 UI 节点
     */
    createNode(item: gc.Item): Node | null {
        let templateName: string | null = null;

        switch (item.type) {
            case gc.IdRaySource: {
                const src = item as gc.RaySource;
                if (src.color.equals(gc.Color.Red)) templateName = 'RaySourceRed';
                else if (src.color.equals(gc.Color.Green)) templateName = 'RaySourceGreen';
                else if (src.color.equals(gc.Color.Blue)) templateName = 'RaySourceBlue';
                else if (src.color.equals(gc.Color.Yellow)) templateName = 'RaySourceYellow';
                else if (src.color.equals(gc.Color.Cyan)) templateName = 'RaySourceCyan';
                else if (src.color.equals(gc.Color.Magenta)) templateName = 'RaySourceMagenta';
                else templateName = 'RaySourceWhite';
                break;
            }
            case gc.IdReflector90:
                templateName = 'Reflector90';
                break;
            case gc.IdReflector45:
                templateName = 'Reflector45';
                break;
            case gc.IdGlassReflector:
                templateName = 'GlassReflector';
                break;
            default:
                return null;
        }

        const template = this.templates.get(templateName);
        if (!template) {
            console.warn(`ItemNodeFactory: Missing template '${templateName}'`);
            return null;
        }

        const node = instantiate(template);
        node.active = true;
        return node;
    }
}
