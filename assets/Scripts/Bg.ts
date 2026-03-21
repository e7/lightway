import { _decorator, Component, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Bg')
export class Bg extends Component {
    @property(Node)
    bg01: Node = null
    @property(Node)
    bg02: Node = null

    @property
    speed: number = 100

    start() {

    }

    update(deltaTime: number) {
        let position1 = this.bg01.position;
        this.bg01.setPosition(position1.x, position1.y - this.speed * deltaTime)

        let position2 = this.bg02.position;
        this.bg02.setPosition(position2.x, position2.y - this.speed * deltaTime)
    }
}


