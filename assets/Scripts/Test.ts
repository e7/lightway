import { _decorator, Component, Node } from 'cc';
import { Color } from './logic/GridCell';
import { Assert } from './assert/Assert';

const { ccclass, property } = _decorator;

@ccclass('Test')
export class Test extends Component {
    start() {
        Assert.equal(Color.Red.add(Color.Green), Color.Yellow)
        
    }

    update(deltaTime: number) {
        
    }
}
