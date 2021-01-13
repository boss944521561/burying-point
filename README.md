# burying-point  
### 自动化打点统计上报器  
引入执行后，它将在你的页面内添加click监听事件，发生点击事件后它将统计域名、哈希、元素的路径组成为唯一标识上报。  

它可以省去人力在代码中植入埋点信息，省去新增埋点需要发布生产的代价。  
你可以在服务端根据接收的唯一标识统计点击次数，后台系统将统计的数据导出做成可视化。  
如果您的DOM结构及Class经常变化，它的唯一标识也将变更，你需在后台系统配置自己的正则规则。或你只需要以发布版本为依据，观测变动前后的数据计数。

### 使用 Use  
npm i burying-point   
import bp from 'burying-point';   
bp.init({  
    log: true, // 日志log  
    port: '/url' // 基础数据请求接口  
 });  


### 输出样例 Sample Output  
{"d":"http://localhost:8081/xxxx/index.html#/detail/","s":"*[@id=app]/DIV/.swiper-box/.swipe-component/.swipe-wrapper/.swipe-item[3]/.placeholder-wrap/"}  

d: [页面前缀] "http://localhost:8081/xxxx/index.html#/detail/"  
s: [元素路径] "*[@id=app]/DIV/.swiper-box/.swipe-component/.swipe-wrapper/.swipe-item[3]/.placeholder-wrap/"  


### @description 统计过程：
 * 
 * [1] 注册入参需要监听的事件（暂只支持click事件）  
 * [2] 查询事件元素是否已有对应事件，如有标记为抓捕对象（例如：已有click事件的元素大概率是做了某事的，默认需要记录此类点击） // 暂未做，因getEventListeners仅在chrome控制台生效  
 * [3] 生成目标元素唯一标识  DOM路径：域 + 哈希 + Xpath(ID名 || 类名 || 节点名 - 下标 )  
 * [4] 查询事件元素有无同类名元素  
 * [4.1] 如有——多个同类元素，统计该类名的元素数组，找出对应元素的下标。（唯一标识 = DOM路径 + 下标）  
 * [4.2] 如无——同——类名元素或类名。（唯一标识 = DOM路径）  
 *   
 * 注意：需统一各浏览器抓捕顺序，抓捕元素设为冒泡。默认抓取元素为目标元素（事件根元素）  


### @description Xpath生成规则：
 * [1] 元素名字：ID > class > nodeName  
 * [1.1] 遍历当前元素class数组，取出每一项  
 * [1.2] 遍历同级元素class数组，取出每一项，如果等于1.1，放入集合计数  
 * [1.3] 得出当前元素class与同级元素对比，有无class出现过多次，如果有取最多的，如果没有取自身第一个，如果有多个相同取最多的中第一个命名  
 * [1.4] 基于1.3，在其后追加第几个出现 [/d]  
 * 
 * 注意：1.4是位数，不是下标。如果需要下标请将num改为num-1  