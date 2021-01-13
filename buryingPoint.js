/**
 * @title 自动化埋点统计 (Automatic burying point)
 * @copyRight https://developer.mozilla.org/zh-CN/docs/Web/API/EventTarget/addEventListener
 * @copyRight https://developer.mozilla.org/zh-cn/docs/web/api/eventlistener
 * @author Mason<mason.meng@wehotelglobal.com>
*/

/**
 * @description 统计过程：
 *
 * [1] 注册入参需要监听的事件（暂只支持click事件）
 * [2] 查询事件元素是否已有对应事件，如有标记为抓捕对象（例如：已有click事件的元素大概率是做了某事的，默认需要记录此类点击） // 暂未做，因getEventListeners仅在chrome控制台生效
 * [3] 生成目标元素唯一标识  DOM路径：域 + 哈希 + Xpath(ID名 || 类名 || 节点名 - 下标 )
 * [4] 查询事件元素有无同类名元素
 * [4.1] 如有——多个同类元素，统计该类名的元素数组，找出对应元素的下标。（唯一标识 = DOM路径 + 下标）
 * [4.2] 如无——同——类名元素或类名。（唯一标识 = DOM路径）
 *
 * 注意：需统一各浏览器抓捕顺序，抓捕元素设为冒泡。默认抓取元素为目标元素（事件根元素）
*/

/**
 * @description Xpath生成规则：
 *
 * [1] 元素名字：ID > class > nodeName
 * [1.1] 遍历当前元素class数组，取出每一项
 * [1.2] 遍历同级元素class数组，取出每一项，如果等于1.1，放入集合计数
 * [1.3] 得出当前元素class与同级元素对比，有无class出现过多次，如果有取最多的，如果没有取自身第一个，如果有多个相同取最多的中第一个命名
 * [1.4] 基于1.3，在其后追加第几个出现 [/d]
 *
 * 注意：1.4是位数，不是下标。如果需要下标请将num改为num-1
*/

class BuryingPoint {
    constructor() {
        this.log = false; // 日志打印开关
        this.event = ['click']; // 默认统计事件 // 'touchstart'
        this.port = ''; // 上报接口
        this.portData = {}; // 上报数据
    }

    // 注册监听器（click）
    _handleListenClick(e) {
        if (this.log) {
            console.log('事件元素——————', e);
        }
        if (e.path && e.path.length) {
            try {
                // 检测是否上报
                this._handleIsSend(e);
            } catch (err) {
                console.error('运行错误——————', err);
            }
        } else {
            console.error('请检查元素path格式——————', e.path);
        }
    }

    // 是否上报
    _handleIsSend(e) {
        // 其余标签仅有绑定过点击事件才统计
        // if (v.target.nodeName !== 'BUTTON' || v.target.nodeName !== 'A') {
        // 获取并处理该元素的事件绑定集合
        // getEventListeners(document)
        // }

        // 生成上报标识
        this._handleCreatePath(e);
    }

    // 生成事件元素唯一标识
    _handleCreatePath(e) {
        let s = '';
        let p = location.origin + location.pathname || '';
        let h = location.hash || '';
        if (h) {
            h = `${h.indexOf('?') === -1 ? h : h.substr(0, h.indexOf('?'))}/`;
        }
        // 遍历Xpath路径所有节点
        e.path.every(v => {
            // 缩短传参，只取重要部分
            if (!v.nodeName || v.nodeName === 'BODY' || v.nodeName === 'HTML' || v.nodeName === '#document') return false;
            let n = '';
            let index = '';
            if (v.id) { // 取ID名
                n = `*[@id=${v.id}]`;
            } else if (v.classList && v.classList.length) { // 取类名
                // 默认取触发元素第一个类名
                let className = v.classList[0];
                // 查阅取与触发元素相同，同级元素最多的类名
                if (v.parentNode && v.parentNode.childNodes && v.parentNode.childNodes.length) {
                    // item元素VS同级，出现最多的class次数
                    let listIndex = 0;
                    // item元素class计数集合
                    let classList = {};
                    // 遍历同级元素
                    v.parentNode.childNodes.forEach(v1 => {
                        // 遍历同级元素的类数组
                        v1.classList && v1.classList.length && v1.classList.forEach(v2 => {
                            // 如果触发元素也有同级元素类名，将类名计入classList内
                            if (v.classList.value.indexOf(v2) !== -1) {
                                classList[v2] = classList[v2] ? classList[v2] + 1 : 1;
                            }
                        });
                        let classListValue = Object.values(classList);
                        // 取最大数的class
                        if (classListValue.length) {
                            const max = Math.max.apply(null, classListValue);
                            listIndex = max;
                            for (let m in classList) {
                                if (max === classList[m]) {
                                    className = m;
                                    return;
                                }
                            }
                        }
                    });
                    // 生成下标
                    // 依赖listIndex，需上方遍历结束后统计num
                    let num = 0;
                    v.parentNode.childNodes.forEach(v1 => {
                        if (v1.classList && v1.classList.length && v1.classList.value.indexOf(className) !== -1) {
                            num++;
                        }
                        // 当前元素，相同class同级至少出现过2次， 同级元素按class排第几位
                        if (v1 === v && listIndex > 1 && num >= 0) {
                            index = `[${num}]`;
                        }
                    });
                }
                n = `.${className}${index}`;
            } else { // 取标签名
                if (v.parentNode && v.parentNode.childNodes && v.parentNode.childNodes.length) {
                    let num = 0;
                    v.parentNode.childNodes.forEach(v1 => {
                        if (v1.nodeName === v.nodeName) {
                            num++;
                        }
                        if (v1 === v && num) {
                            index = `[${num}]`;
                        }
                    });
                }
                n = v.nodeName + index;
            }
            // 出参：域 + 路由 + 哈希 + 自定义Xpath
            s = `${n}/${s}`;
            return true;
        });

        this.portData = {
            d: p + h,
            s
        };
        this._port();
    }

    // 初始化入参
    _handleInitParams(e) {
        if (Object.prototype.toString.call(e.log) === '[object Boolean]') {
            this.log = e.log;
        }
        if (Object.prototype.toString.call(e.port) === '[object String]') {
            this.port = e.port;
        }
        // 暂不支持自定义事件统计
        // if (Object.prototype.toString.call(e.event) === '[object Array]') {
            // this.event = e.event;
        // }
    }

    // 上报数据
    _port() {
        if (!this.port) {
            console.info('_port——无接口数据');
            return;
        }
        const data = JSON.stringify(this.portData);
        if (this.log) {
            console.info(`%c自动化埋点统计上报数据：`, `color:#b8920c;`, data);
        }
        if ('sendBeacon' in navigator && navigator.sendBeacon(this.port, data)) {
            console.info('_port——成功进入浏览器请求队列');
        } else {
            fetch(this.port, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                mode: 'cors',
                body: data
            })
            .then((r) => {
                console.log(r);
            }).catch((e) => {
                console.log(e);
            });
        }
    }

    init(e = {}) {
        // 初始化入参
        this._handleInitParams(e);

        // 注册监听器
        const func = e => {
            this._handleListenClick(e);
        };
        this.event.forEach(e => {
            window.addEventListener(e, func, false);
            // 兼容移动端unload不执行
            window.addEventListener('pagehide', () => {
                window.removeEventListener(e, func, false);
            });
            // 卸载监听的事件函数
            window.addEventListener('unload', () => {
                window.removeEventListener(e, func, false);
            });
        });
        // 调试模式
        if (this.log) {
            window.onbeforeunload = () => {
                return '调试呢，先别跳';
            };
        }
    }
}

export default new BuryingPoint();

