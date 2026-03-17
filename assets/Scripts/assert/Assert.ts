// Assert.ts
export class Assert {
    // 断言相等
    static equal(actual: any, expected: any, msg = "值不相等") {
        if (actual !== expected) {
            console.error(`❌ 失败：${msg}，实际：${actual}，期望：${expected}`);
        } else {
            console.log(`✅ 通过`);
        }
    }

    // 断言为 true
    static isTrue(actual: boolean, msg = "应该为 true") {
        this.equal(actual, true, msg);
    }
}