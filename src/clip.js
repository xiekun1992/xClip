(function(global, factory){
	if(typeof define === 'function' && define.amd){ //amd
		define('xClip', factory);
	}else if(typeof module === 'object' && module.exports && typeof exports === 'object'){//commonjs
		module.exports = factory();
	}else if(typeof exports === 'object'){ //es6
		exports.xClip = factory();
	}else{ //default
		global.xClip = factory();
	}
})(this, function(){
	function Event(){
		this.events = {};
	}
	Event.prototype.on = function(eventName, cb){
		if(!this.events[eventName]){
			this.events[eventName] = [];
		}
		this.events[eventName].push(cb);
	};
	Event.prototype.trigger = function(eventName, data){
		var cbs = this.events[eventName];
		if(cbs){
			for(var i = 0; i < cbs.length; i++){
				cbs[i](data);
			}
		}
	};
	Event.prototype.unbind = function(eventName, cb){
		var cbs = this.events[eventName];
		if(cbs){
			for(var i = cbs.length - 1; i >= 0; i--){
				if(cbs[i] === cb){
					cbs.splice(i, 1);
				}
			}
		}
	};
	function Clip(options){
		Event.call(this);

		var defaultOptions = {
			container: document.body, // 初始化裁剪图片组件的父节点
			imagePath: '', // image url 图片路径，图片路径和图片文件对象二选一即可，否则以图片路径优先
			imageFile: '', // file object 图片文件对象，可通过input[type=file]添加
			addOverlay: false, // 圆形阴影遮罩层
			previewImages: [], // 预览图片配置 {container: domElement, size: previewImageSize}
			enableMove: true,
			enableZoom: true,
			enableRotate: true, 
			increment: 0.01, // 缩放时的变化量
			touchFault: 0 // 红外屏触屏状态，防手指按下不动时图片抖动，建议设置8
		}
		options = Object.setPrototypeOf(options, defaultOptions);

		this.container = options.container;
		this.imageFile = options.imageFile;
		this.addOverlay = options.addOverlay;
		this.enableMove = options.enableMove;
		this.enableZoom = options.enableZoom;
		this.enableRotate = options.enableRotate;
		this.previewImages = options.previewImages;
		this.increment = options.increment;
		this.touchFault = options.touchFault;

		
		this.imageName = options.imagePath && options.imagePath.split('/').pop() || this.imageFile.name;
		this.imagePath = options.imagePath || window.URL.createObjectURL(this.imageFile);

		this.edge = options.edge || 300;
		this.originPos = {x: 0, y: 0};
		// 保存图片左上角和右下角到矩形显示框的距离
		this.edgeDistance = {x1: 0, y1: 0, x2: 0, y2: 0};
		this.scale = 1;

		this.rotationImages = []
		this.rotatePos = 0; // 1: right, 2: down, 3: left, 4: up

		this.img = new Image();
		this.imgWidth = this.imgHeight = 0;
		this.previewImgs = [];
	}
	Clip.prototype = Object.create(Event.prototype);

	Clip.prototype.init = function(){
		this.initDom();
		this.initEvent();
		this.preview();

		this.ctx = this.mainCanvas.getContext('2d');
		var overlayCtx = this.overlayCanvas.getContext('2d');
		this.loadImage(function() {
			this.addOverlay && this.drawOverlay(overlayCtx, this.edge / 2, this.edge / 2, this.edge / 2);
			this.trigger('clip.init');
		}.bind(this));
		return this;
	};
	Clip.prototype.refresh = function(options){
		this.imageName = options.imagePath && options.imagePath.split('/').pop() || options.imageFile.name;
		this.imagePath = options.imagePath || window.URL.createObjectURL(options.imageFile);

		this.loadImage(function() {
			this.trigger('clip.refresh');
		}.bind(this));
	};
	Clip.prototype.loadImage = function(callback){
		this.img.onload = function(){
			this.imgWidth = this.img.width;
			this.imgHeight = this.img.height;
			// 将大图等比例缩小到方框的大小，将小图等比例放大到方框的大小
			this.scale = this.edge / Math.min(this.img.width, this.img.height);
			// 默认居中显示
			this.originPos = {
				x: (this.edge - this.imgWidth * this.scale) / 2, 
				y: (this.edge - this.imgHeight * this.scale) / 2
			};
			this.edgeDistance = {
				x1: this.originPos.x, 
				y1: this.originPos.y, 
				x2: this.originPos.x, 
				y2: this.originPos.y
			};
			this.draw();
			// 计算旋转用到的各角度的图片
			if(this.enableRotate){
				this.rotationImages = createRotationImage(this.img, this.edge);
			}
			callback && callback();
		}.bind(this);
		this.img.src = this.imagePath;
	};
	Clip.prototype.destroy = function(){
		this.dom.removeChild(this.mainCanvas);
		this.dom.removeChild(this.overlayCanvas);
		this.container.removeChild(this.dom);
		this.container = this.imagePath = this.originPos = this.rotationImages = this.img = this.ctx = null;
		this.dom = this.overlayCanvas = this.mainCanvas = null;
		this.trigger('clip.destroy');
		this.events = null;
		this.previewImages.forEach(function(p){
			p.container.innerHTML = '';
		});
		this.previewImgs = [];
	};
	Clip.prototype.initDom = function(){
		this.dom = document.createElement('div');
		this.dom.setAttribute('class', 'x-clip');

		this.overlayCanvas = document.createElement('canvas');
		this.mainCanvas = document.createElement('canvas');

		this.overlayCanvas.width = this.overlayCanvas.height = this.mainCanvas.width = this.mainCanvas.height = this.edge;
		this.dom.style.width = this.dom.style.height = this.edge + 'px';

		this.overlayCanvas.setAttribute('class', 'overlay');
		this.mainCanvas.setAttribute('class', 'main-canvas');

		this.dom.appendChild(this.overlayCanvas);
		this.dom.appendChild(this.mainCanvas);
		this.container.appendChild(this.dom);
		return this;
	};
	Clip.prototype.initEvent = function(){
		// 移动交互
		var mousedownPos, moving = false, scaling = false, scaleDistance = 0, domOffset = mapMousePosition(this.dom), prevPos;
		// console.log(domOffset)
		this.dom.addEventListener('mousedown', startMove);
		this.dom.addEventListener('mousemove', dealMove.bind(this));
		this.dom.addEventListener('mouseup', cancelMove);
		this.dom.addEventListener('mouseout', cancelMove);
		this.dom.addEventListener('mouseleave', cancelMove);

		this.dom.addEventListener('touchstart', startMove, {passive: false});
		this.dom.addEventListener('touchmove', dealMove.bind(this), {passive: false});
		this.dom.addEventListener('touchend', cancelMove, {passive: false});
		this.dom.addEventListener('touchcancel', cancelMove, {passive: false});

		function mapMousePosition(element) {
			if (element) {
				var offset = {
						x: element.offsetLeft,
						y: element.offsetTop
					},
					parentNode = element.parentNode;
				if (parentNode && parentNode.tagName.toLowerCase() !== "body") {
					var parentOffset = mapMousePosition(parentNode);
					offset.x += parentOffset.x;
					offset.y += parentOffset.y;
				}
				return offset;
			}
		};
		function extractPos(e){
			scaling = false;
			if(e.touches && e.touches.length > 0){
				if(e.touches.length == 2){
					// 按下两指，处于触屏缩放
					scaling = true;
					return [
						{x: e.touches[0].pageX, y: e.touches[0].pageY},
						{x: e.touches[1].pageX, y: e.touches[1].pageY}
					];
				}
				return [{x: e.touches[0].pageX, y: e.touches[0].pageY}];
			}
			return [{x: e.pageX, y: e.pageY}];
		}
		function calcFingerDistance(p1, p2){
			return Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2);
		}
		function isWithinTouchFault(p1, p2){
			if(p1 && p2){
				return Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2) < Math.pow(this.touchFault, 2);
			}
			return true;
		}
		function startMove(e){
			prevPos = mousedownPos = extractPos(e); // 记录初始按下的位置
			if(!scaling){ 
				mousedownPos = mousedownPos[0];
			}else{
				scaleDistance = calcFingerDistance(mousedownPos[0], mousedownPos[1]);
			}
			moving = true;
		}
		function dealMove(e){
			if(moving){
				var points = extractPos(e);
				if(scaling){ // 双指缩放
					// 判断触屏下手指移动是否超过阈值，未超过则不动，否则进行缩放
					if(isWithinTouchFault.call(this, prevPos[0], points[0]) && isWithinTouchFault.call(this, prevPos[1], points[1])) return ;
					var distance = calcFingerDistance(points[0], points[1]);
					if(distance < scaleDistance){
						this.zoom(false);
						this.trigger('clip.zoom', false);
					}else if(distance > scaleDistance){
						this.zoom(true);
						this.trigger('clip.zoom', true);
					}
					scaleDistance = distance;
					prevPos = points;
				}else{ // 单指或鼠标移动
					if(typeof mousedownPos.x !== 'undefined' && typeof mousedownPos.y !== 'undefined'){ // 防止缩放的时候移动出现undefined，导致计算得到NaN
						points = points[0];
						var deltaPos = {x: 0, y: 0};
						deltaPos.x = points.x - mousedownPos.x;
						deltaPos.y = points.y - mousedownPos.y;
						mousedownPos.x = points.x;
						mousedownPos.y = points.y;
						this.move(deltaPos.x, deltaPos.y);
						this.trigger('clip.move');
					}
				}
			}
		}
		function cancelMove(e){
			moving = false;
		}
		// 缩放交互
		this.dom.addEventListener('mousewheel', function(e){
			if(e.wheelDelta > 0){
				this.zoom(true);
				this.trigger('clip.zoom', true);
			}else{
				this.zoom(false);
				this.trigger('clip.zoom', false);
			}
			e.stopPropagation();
			e.preventDefault();
		}.bind(this), {passive: false});
	};
	Clip.prototype.move = function(deltaX, deltaY){
		if(!this.enableMove) return ;
		// 移动
		this.originPos.x += deltaX;
		this.originPos.y += deltaY;
		this.draw();
	}
	Clip.prototype.rotate = function(isRotateLeft){
		if(!this.enableRotate) return ;
		if(isRotateLeft){
			this.rotatePos++;
			this.originPos = {x: -this.edgeDistance.y2, y: -this.edgeDistance.x1};
		}else{
			this.rotatePos--;	
			if(this.rotatePos < 0){
				this.rotatePos += this.rotationImages.length;
			}
			this.originPos = {x: -this.edgeDistance.y1, y: -this.edgeDistance.x2};
		}
		this.img = this.rotationImages[this.rotatePos % this.rotationImages.length];
		this.imgWidth = this.img.width;
		this.imgHeight = this.img.height;
		this.draw();
		// this.trigger('clip.rotate');
	};
	Clip.prototype.zoom = function(isZoomIn, zoomStep){
		if(!this.enableZoom) return ;
		var step = zoomStep;
		if(!step || step < 0){
			step = 1;
		}
		var increment = this.increment * step;
		if(isZoomIn){
			if(this.scale + increment > 1){
				return;
			}
			this.scale += increment;
			increment = -increment;
		}else{
			this.scale -= increment;
			if(this.scale * Math.min(this.img.width, this.img.height) < this.edge){
				this.scale = this.edge / Math.min(this.img.width, this.img.height);
				return ;
			}
		}
		this.originPos.x = this.originPos.x + increment * this.imgWidth / 2;
		this.originPos.y = this.originPos.y + increment * this.imgHeight / 2;
		this.draw();
	}
	Clip.prototype.draw = function(){
		this.edgeExceedCheck();
		this.ctx.clearRect(0, 0, this.edge, this.edge);
		this.ctx.drawImage(this.img, 0, 0, this.imgWidth, this.imgHeight, this.originPos.x, this.originPos.y, this.imgWidth * this.scale, this.imgHeight * this.scale);
		this.trigger('clip.draw');
		return this;
	};
	Clip.prototype.edgeExceedCheck = function(){
		// 纠正变换后图片超出边界
		if(this.originPos.x > 0){
			this.originPos.x = 0;
		}
		if(this.originPos.y > 0){
			this.originPos.y = 0;
		}
		if(this.originPos.x + this.imgWidth * this.scale < this.edge){
			this.originPos.x = this.edge - this.imgWidth * this.scale;
		}
		if(this.originPos.y + this.imgHeight * this.scale < this.edge){
			this.originPos.y = this.edge - this.imgHeight * this.scale;
		}
		this.edgeDistance = {
			x1: Math.abs(this.originPos.x), 
			y1: Math.abs(this.originPos.y), 
			x2: this.imgWidth * this.scale - this.edge - Math.abs(this.originPos.x),
			y2: this.imgHeight * this.scale - this.edge - Math.abs(this.originPos.y)
		};
		// console.log(this.edgeDistance);
	}
	// 旋转
	function createRotationImage(img, frameEdge){
		var imgs = [];
		var tmpCanvas = document.createElement('canvas');
		var tmpCtx = tmpCanvas.getContext('2d');

		function rotateAndDraw(img, degree, x, y){
			var edge = Math.min(img.width, img.height);
			// 修改画布的大小以显示完整图片
			if(x == y){
				tmpCanvas.width = img.width;
				tmpCanvas.height = img.height;
			}else{
				tmpCanvas.width = img.height;
				tmpCanvas.height = img.width;
			}
			tmpCtx.clearRect(0, 0, tmpCanvas.width, tmpCanvas.height);

			tmpCtx.translate(x * edge, y * edge);
			tmpCtx.rotate(degree);
			
			var deltaX, deltaY;
			if(img.width < img.height){
				deltaY = x * (edge - img.height);
				deltaX = 0;
			}else{
				deltaX = y * (edge - img.width);
				deltaY = 0;
			}
			tmpCtx.drawImage(img, 0, 0, img.width, img.height, deltaX, deltaY, img.width, img.height);

			var rImg = new Image();
			rImg.src = tmpCanvas.toDataURL();
			return rImg;
		}
		// 初始图片
		imgs[0] = rotateAndDraw(img, 0, 0, 0);
		// 顺时针90度
		imgs[1] = rotateAndDraw(img, Math.PI / 2, 1, 0);
		// 顺时针180度
		imgs[2] = rotateAndDraw(img, Math.PI, 1, 1);
		// 顺时针270度
		imgs[3] = rotateAndDraw(img, Math.PI / 2 * 3, 0, 1);
		return imgs;
	}
	Clip.prototype.drawOverlay = function(ctx, x, y, radius){
		var globalCompositeOperation = ctx.globalCompositeOperation;
		ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
		ctx.fillRect(0, 0, x * 2, y * 2);
		ctx.globalCompositeOperation = 'destination-out';
		ctx.arc(x, y, radius, 0, 2 * Math.PI);
		ctx.fillStyle = '#ffffff';
		ctx.fill();
		ctx.globalCompositeOperation = globalCompositeOperation;

		return this;
	};
	Clip.prototype.cut = function(){
		return {
			src: this.mainCanvas.toDataURL(),
			filename: this.imageName
		}
	};
	Clip.prototype.preview = function(){
		this.previewImages.forEach(function(config){
			var canvas = document.createElement('canvas');
			canvas.width = canvas.height = config.size;
			this.previewImgs.push({ctx: canvas.getContext('2d'), size: config.size});
			config.container.appendChild(canvas);
		}.bind(this));

		if(this.previewImgs.length > 0){
			this.on('clip.draw', function(){
				this.previewImgs.forEach(function(p){
					p.ctx.clearRect(0, 0, p.size, p.size);
					p.ctx.drawImage(this.img, 0, 0, this.img.width, this.img.height, 
						this.originPos.x * p.size / this.edge, this.originPos.y * p.size / this.edge, this.imgWidth * this.scale * p.size / this.edge, this.imgHeight * this.scale * p.size / this.edge);
				}.bind(this));
			}.bind(this));
		}
	}
	return Clip;
});