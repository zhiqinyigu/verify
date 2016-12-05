(function (root, deps, exportName, factory) {
	if (typeof deps === 'string') {
		factory = exportName;
		exportName = deps;
		deps = [];
	}

	if (typeof module === 'object' && module.exports) {
		module.exports = factory();
	} else if (typeof define === 'function' && define.amd) {
		define(deps, factory);
	} else {
		root[exportName] = factory();
	}
}(this, ['jquery'], 'Verify', function ($) {
	$ = $ || jQuery;

	if (!$) {throw 'not jQuery';}


	// 跟$.when相反。任意一个promise resolve时resolve，then的参数是resolve的数据。
	// 全部reject时reject，then的参数是一个包含全部错误信息的数组，错误信息按照顺序排列。
	$.any = function() {
		var dfd = new $.Deferred(),
			isResolve,
			ready_count = 0,
			len = arguments.length,
			result = new Array(len);

		function fail(data) {
			ready_count++;

			if (ready_count === len && !isResolve) {
				dfd.reject.call(dfd, result);
			}
		}

		function success(data) {
			ready_count++;
			isResolve = true;
			dfd.resolve(data);
		}

		$.each(arguments, function(i, pr) {
			function _fail(data) {
				result[i] = data;
				fail(data);
			}

			pr.then(success, _fail);
		});

		return dfd.promise();
	};

	function rangeTipsFactory(defaultTips) {
		return function(input, length) {
			var match = rangShortcutReg.exec(input.getAttribute('data-rule'));

			if (match) {
				return '请保证在 ' + match[1] + '~' + match[2] + ' 以内';
			} else {
				return defaultTips + length;
			}
		}
	}

	var doubleByteReg = /[^\x00-\xff]/g,
		tipsReg = /^(\S+)\{(\S+)\}$/,
		lengthShortcutReg = /(?:^|;)(\d+)-(\d+)(?:;|$)/, // 长度的快捷写法
		rangShortcutReg = /(?:^|;)num(\d+)-(\d+)(?:;|$)/, // 闭区间的快捷写法
		charLengthShortcutReg = /(?:^|;)char(\d+)-(\d+)(?:;|$)/, // 字符长度的快捷写法
		paramsFunReg = /^((?:max|min)length|(?:OI)?(?:min|max))(\d+)$/i, // 内部定义的带参数rule function的定义语法
		customParamsFunReg = /(\w+)\(([\s\S]*)\)/, // 供用户使用的带参数rule function的定义语法。其实原理都是一样的，只是这个辅助库的初期设计不好，没有考虑到带参数的规则，但现在又要兼容旧写法
		isRequiredReg = /(^|;)required(\{[^\}]*\})*(;|$)/,
		defaultSetting = {
			onPass: emptyFn,
			onError: emptyFn,
			onGlobalError: emptyFn,
			eventType: 'blur',
			ruleName: 'data-rule'
		},
		defaultConfig = {
			rules: {
				required: /\S/,
				mail: /^(?:[a-z0-9]+[_\-+.]?)*[a-z0-9]+@(?:([a-z0-9]+-?)*[a-z0-9]+\.)+([a-z]{2,})+$/i,
				digit: /^\d+$/,
				alphameric: /^\w+$/,
				chinese: /^[\u4e00-\u9fa5]+$/,
				carPate: /^[\u4e00-\u9fa5]{1}[A-Z]{1}[A-Z_0-9]{5}$/,
				trailerNum: /^[\u4e00-\u9fa5]{1}[A-Z]{1}[A-Z_0-9]{4,5}挂$/,
				noSymbols: /^[\u4e00-\u9fa5a-zA-Z0-9]+$/, // 只含中文，英文，数字及其组合
				// mobile: /^(0|86|17951)?(13[0-9]|15[012356789]|17[678]|18[0-9]|14[57])[0-9]{8}$/,
				mobile: /^1[3|4|5|7|8]\d{9}$/, // 后端的规则
				telephone: /^(^0\d{2}-?\d{8}$)|(^0\d{3}-?\d{7,8}$)|(^\(0\d{2}\)-?\d{8}$)|(^\(0\d{3}\)-?\d{7,8}$)$/,
				max: function(input, val, length) {
					return +input.value <= +length;
				},
				min: function(input, val, length) {
					return +input.value >= +length;
				},
				// open interval 开区间
				OIMax: function(input, val, length) {
					return +input.value < +length;
				},
				OIMin: function(input, val, length) {
					return +input.value > +length;
				},
				maxlength: function(input, inputVal, length) {
					return input.value.length <= +length;
				},
				minlength: function(input, inputVal, length) {
					return inputVal.length >= +length;
				},
				/**
			     * [银行开好Luhm校验:Luhm校验规则:16位银行卡(19位通用)]
			     * 1.将未带校验位的15(或18)位卡号从右依次编号1到15(18),位于奇数位号上的数字乘以2
			     * 2.将奇数乘积的十位全部相加,在加上所有偶数位上的数字
			     * 3.将加法和加上校验位能被10整除
			     * @param  {[string]} value [银行卡号]
			     * @return {[boolean]}       [是否为银行卡号]
			     */
			    bankNum: function(input) {
			    	var value = input.value;

			        if (/[^0-9 \-]+/.test(value)) {
			            return false;
			        }
			        var nCheck = 0,
			            nDigit = 0,
			            bEven = false;
			        value = value.replace(/\D/g, "");

			        for (var n = value.length - 1; n >= 0; n--) {
			            var cDigit = value.charAt(n);
			            nDigit = parseInt(cDigit, 10);
			            if (bEven) {
			                if ((nDigit *= 2) > 9) {
			                    nDigit -= 9;
			                }
			            }
			            nCheck += nDigit;
			            bEven = !bEven;
			        }
			        return (nCheck % 10) === 0;
			    },
			    charlength: function(input, val, params) {
			    	var str = input.value,
			    		len;

					if (str == null) {
						str = '';
					} else if (typeof str != 'string'){
						str += '';
					}

					len = str.replace(doubleByteReg, '01').length;
					return +params[0] <= len && len <= +params[1];
				}
            },
			tips: {
				required: function(input) {
					var title = input.title;

					if (title) {
						if (input.nodeName == 'INPUT') {
							return '请输入' + title;
						} else if (input.nodeName == 'SELECT') {
							return '请选择' + title;
						} else {
							return title + '不能为空';
						}
					}

					return '不能为空';
				},
				mail: '邮箱格式不正确',
				chinese: '请输入中文',
				carPate: '请输入正确车牌号',
				trailerNum: '请输入正确挂车牌号',
				noSymbols: '不能包含空格和符号',
				digit: '请填数字',
				alphameric: '请填写字母或数字',
				telephone: '固话格式不正确',
				mobile: '手机号格式不正确',
				bankNum: '银行卡号不正确',
				maxlength: function(input, length) {
					return '长度不能超过' + length + '个字';
				},
				minlength: function(input, length) {
					return '长度必须为' + length + '个字以上。含' + length + '个';
				},
				min: rangeTipsFactory('请保证大于或等于'),
				max: rangeTipsFactory('请保证小于或等于'),
				OIMax: function(input, length) {
					return '请保证小于' + length;
				},
				OIMin: function(input, length) {
					return '请保证大于' + length;
				},
				charlength: function(input, params) {
					return '请保证在' + params[0] + '~' + params[1] + '个字符';
				}
			}
		};



	function emptyFn() {}

	function returnReject(val) {
		return new $.Deferred().reject(val);
	}

	function parseTipText(str) {
		var match = tipsReg.exec(str);

		if (match) {
			return {
				name: match[1],
				id: match[2]
			}
		}

		return str;
	}

	function parseRuleText(str) {
		var arr;

		str = (str + ';').replace(lengthShortcutReg, function(_, min, max) {
			return ';minlength' + min + ';maxlength' + max + ';';
		}).replace(rangShortcutReg, function(_, min, max) {
			return ';min' + min + ';max' + max + ';';
		}).replace(/;+/g, ';').replace(/^;+/, '');

		arr = str.split(';').map(function(item, i) {
			if (item.indexOf('|') !== -1) {
				return item.split('|').map(function(item, i) {
					return parseTipText(item);
				});
			}

			return parseTipText(item);
		})

		arr.length = arr.length - 1;

		return arr;
	}

	function getRule(self, name) {
		var rule, match, param, ruleFnWrap;

		if (match = paramsFunReg.exec(name)) {
			name = match[1];
			param = match[2];
		} else if (match = customParamsFunReg.exec(name)) {
			name = match[1];
			param = match[2].split(/\s*,\s*/);
		}

		rule = self.setting.rules && self.setting.rules[name] || defaultConfig.rules[name] || self.setting[name];

		if (match) {			
			ruleFnWrap = function(input, inputVal) {
				return rule(input, inputVal, param);
			}

			// 记下真实的规则引用，以使得createPr验证失败时，可以提供完整的错误信息(验证条件)
			ruleFnWrap._rule = rule;

			return ruleFnWrap;
		}

		if (rule) {
			return rule;
		} else {
			console.warn('No "' + name + '" rule');
		}
	}

	function getTipsText(self, name, input) {
		var tipsText, match, param;

		if (match = paramsFunReg.exec(name)) {
			name = match[1];
			param = match[2];
		} else if (match = customParamsFunReg.exec(name)) {
			name = match[1];
			param = match[2].split(/\s*,\s*/);
		}

		tipsText = (self.setting.tips && self.setting.tips[name]) || defaultConfig.tips[name];

		if ($.type(tipsText) === 'function') {
			tipsText = tipsText(input, param);
		}

		return tipsText;
	}

	function createPr(val, tipsText, input, inputVal) {
		var fnResult, dfd;

		// 如果是数组，则生成$.any();
		if ($.isArray(val)) {
			return $.any.apply($, val).then(undefined, function(data) {
				return returnReject({
					condition: data,
					msg: tipsText
				});
			});
		} else {
			// 如果是函数，返回promise（如果是）或运行结果
			if ($.type(val) === 'function') {
				fnResult = val(input, inputVal);

				if (fnResult === false) {
					return returnReject({
						condition: val._rule || val,
						msg: tipsText
					});
				} else if (typeof fnResult === 'object' && typeof fnResult.then === 'function') {
					return fnResult.then(undefined, function(data) {
						return returnReject({
							condition: fnResult,
							msg: data || tipsText
						});
					});
				} else {
					return $.when(fnResult);
				}
			} else if ($.type(val) === 'regexp') {
				if (val.test(inputVal)) {
					return $.when();
				} else {
					return returnReject({
						condition: val,
						msg: tipsText
					});
				}
			} else if (typeof val === 'undefined') {
				return $.when();
			} else {
				throw "Type of accident";
			}
		}
	}

	function getTipsTarget(el) {
		var agent = el.getAttribute('data-tips-agent');

		return agent ? document.getElementById(agent) : el;
	}

	function Verify(ele, setting) {
		this.init(ele, setting);
	}

	Verify.prototype = {
		init: function(ele, setting) {
			var self = this;

			this.setting = $.extend({}, defaultSetting, setting);
			this.$form = $(ele);

			// 如果传了onSubmit且ele是表单，则代理提交事件。
			var isLegal = false;
			if (this.setting.onSubmit && this.$form.is('form')) {
				this.$form.on('submit', function() {
					if (isLegal) {
						return true;
					} else {
						self.collectCtrl().check().then(function() {
							isLegal = true;
							self.setting.onSubmit.call(self);
							isLegal = false;
						}, function(data) {
							self.setting.onIntercept && self.setting.onIntercept.call(self, data);
						});

						return false;
					}
				});
			}

			this.collectCtrl();
		},

		collectCtrl: function() {
			var ruleName;
			ruleName = this.setting.ruleName;

			// unbind prev event
			this.$ipts && this.$ipts.off('.cVerify');
			this.$groups && this.$groups.off('.cVerify');

			// find form control
			var checkBoxAndRadioArr = [],
				groupsKeys = [],
				checkBoxAndRadioReg = /^(checkbox|radio)$/i;

			this.$ipts = this.$form.find('input[' + ruleName + '], textarea[' + ruleName + '], select[' + ruleName + ']').filter(function() {				
				var type = this.type,
					name = this.getAttribute('name');

				if (checkBoxAndRadioReg.test(type) && this.nodeName === 'INPUT') {
					if (groupsKeys.indexOf(name) === -1) {
						name && groupsKeys.push(name); // 没有name属性的input视为非同一组，所以不加入groupsKeys。
						checkBoxAndRadioArr.push(this);
					}

					return false;
				} else {
					return true;
				}
			});

			this.$groups = $(checkBoxAndRadioArr);

			this.bindEvent();
			return this;
		},

		bindEvent: function() {
			var prevTarget,
				event_timer,
				self = this,
				checkControlAndTriggetEvent = self.checkControlAndTriggetEvent,
				eventName = $.map(self.setting.eventType.split(/\s+/), function(e) {
					 return e + '.cVerify'
				}).join(' ');


			// 监听change input事件，这些事件每次都静默验证一次控件，如果验证通过，
			// 则调用checkControlAndTriggetEvent触发onPass。以使验证状态尽快跟视图保持同步。
			var auxiliaryEvent = '';

			if (!(/($|\s)input\b/.test(eventName))) {
				auxiliaryEvent += 'input.cVerify ';
			}
			if (!(/($|\s)change\b/.test(eventName))) {
				auxiliaryEvent += 'change.cVerify ';
			}


			function delayVerify(ipt, fn, delay) {
				// self.__experienceActiveVerify = false; // 是否经历了主动验证？即主动调用
				// prevTarget = ipt;

				if (delay) {
					setTimeout(function() {
						// 如果经历了主动验证，就不再调用，因为不知道onGlobalError做了什么事情。
						// 可能会被意外的延迟触发的onError或onPass影响
						// if (!self.__experienceActiveVerify && ipt != prevTarget) {
							fn.call(self, ipt);
						// }
					}, delay);
				} else {
					fn.call(self, ipt);
				}
			}

			// 对focus做特殊处理，使之获得当前组件的验证（错误）信息
			if (eventName) {
				this.$ipts.add(this.$groups).on(eventName, function(e) {
					/*var ipt = this;

					if (prevTarget == ipt) {
						clearTimeout(event_timer);
					}

					prevTarget = ipt;
					event_timer = setTimeout(function() {
						prevTarget = null;
						if (e.type !== 'focus' || $(ipt).is('.has-error')) {
							self.checkControlAndTriggetEvent(ipt);
						}
					}, 100);*/

					delayVerify(this, checkControlAndTriggetEvent, +$(this).attr('data-rule-delay'));
				}).on('focus.cVerify', function() {
					$(this).is('.has-error') && delayVerify(this, checkControlAndTriggetEvent, 100);
				}).on(auxiliaryEvent, function() {
					var ipt = this;

					self.checkControl(ipt).then(function() {
						checkControlAndTriggetEvent.call(self, ipt);
					})
				});
			}

			/*this.$ipts.each(function() {
				$(this).data('verifyRule', this.getAttribute(self.setting.ruleName));
			});

			this.$groups.each(function() {
				$(this).data('verifyRule', this.getAttribute('data-verify-group'));
			});*/
		},

		/**
		 * 按照控件定义的规则顺序检验一个控件，返回一个pormise。不会触发任何事件。
		 * @param  {HTMLElement} input    要检验的表单控件
		 * @param  {*}           inputVal 控件的值，一般不传。
		 * @return {Object}
		 */
		checkControl: function(input, inputVal) {
			var self = this,
				$input = $(input),
				globalTipsSheet = $.extend({}, defaultConfig.tips, self.setting.tips),
				globalRuleSheet = $.extend({}, defaultConfig.rules, self.setting.rules),
				stepLenReg = /^(\D+)(\d+)-(\d+)$/,
				availableIpt,
				inputName,
				tipsSheet = $.parseJSON($input.attr('data-tips') || '{}'),
				RuleText = $input.attr(self.setting.ruleName), // $input.data('verifyRule'),
				rules = RuleText && parseRuleText(RuleText) || [];

			input = $input[0];

			function getRuleResult(ruleName, tipsText) {
				var ruleEntity, key,
					val = input.value,
					match, max, min;

				// 支持对特定条件添加长度条件。如：chinese3-4。
				if (typeof ruleName === 'string') {
					if (match = stepLenReg.exec(ruleName)) {
						key = match[1];
						max = +match[3];
						min = +match[2];

						if (val.length > max) {
							return returnReject({
								condition: globalRuleSheet.maxlength,
								msg: globalTipsSheet.maxlength(input, max)
							});
						} else if (val.length < min) {
							return returnReject({
								condition: globalRuleSheet.minlength,
								msg: globalTipsSheet.minlength(input, min)
							});
						} else if (min === 0 && val.length === 0) {
							return $.when();
						} else {
							ruleName = ruleName.replace(/(\d+)-(\d+)$/, '');
						}
					}

					ruleEntity = getRule(self, ruleName);
					tipsText = tipsText || getTipsText(self, ruleName, input);
				}


				if ($.isArray(ruleName)) {
					ruleEntity = $.map(ruleName, function(item) {
						return getRuleResult(item);
					});
				} else if (typeof ruleName === 'object') {
					return getRuleResult(ruleName.name, tipsSheet && tipsSheet[ruleName.id]);
				}

				return createPr(ruleEntity, tipsText, input, inputVal);
			}

			if ((/^(checkbox|radio)$/i).test(input.type) && input.nodeName === 'INPUT') {
				// 如果没有提供inputVal，则获取name值相同，且被选中，且没有data-verify-ignore属性的input生成数组。
				inputName = $input.attr('name');

				if (!inputVal) {
					availableIpt = (inputName ? self.$form.find('input[name="' + $input.attr('name') + '"]') : $input).filter(function() {
						return !this.hasAttribute('data-verify-ignore') && !this.disabled;
					});

					if (availableIpt.length) {
						inputVal = $.map(availableIpt.filter(function() {
							return this.checked;
						}), function(ipt) {
							return ipt.value;
						});
					} else {
						return $.when();
					}
				}
			} else {
				// 有data-verify-ignore属性时，跳过检查。
				if (input.hasAttribute('data-verify-ignore') || input.disabled) {
					return $.when();
				}

				inputVal = $input.val() || input.value;
			}



			return rules.reduce(function(pr, item) {
				return pr.then(function() {
					return getRuleResult(item);
				})
			}, $.when()).then(undefined, function(data) {
				var isEmpty = $.type(inputVal) === 'array' ? !inputVal.length : !inputVal.replace(/^\s*|\s*$/g, ''),
					customMsg;
					// msg = data.msg;

				// 因为零担易注册页的需求，电话区号和号码分开检测且非必填
				// 所以采用动态加require实现正确的错误提示。故需重新获取RuleText
				RuleText = $input.attr(self.setting.ruleName);

				if (isEmpty) {
					if (isRequiredReg.test(RuleText) || $.type(data.condition && data.condition.then || data.condition) == 'function') {
						customMsg = input.getAttribute('data-nullmsg');
						customMsg && (data.msg = customMsg);

						return returnReject(data);
					} else {
						return $.when();
					}
				} else {						
					customMsg = input.getAttribute('data-errormsg');
					customMsg && (data.msg = customMsg);

					return returnReject(data);
				}
			});
		},

		/**
		 * 检查控件的有效性，并触发相应事件
		 * @param  {HTMLElement/String/jQuery} input      DOM对象或选择器等$()能识别的参数。
		 * @param  {Object}   scopeInfo      作用域信息，仅内部使用。在检查表单可用性时，代表着当前控件发生事件时所在的验证循环上下文信息。
		 * @return {Object}   返回一个promise
		 */
		checkControlAndTriggetEvent: function(input, scopeInfo) {
			var self = this,
				agent,
				emptyReg = /^\s*|\s*$/g;

			input = $(input)[0];
			agent = getTipsTarget(input);
			this.__experienceActiveVerify = true;

			return self.checkControl(input).then(function(data) {
				scopeInfo && ++scopeInfo.info;
				data = {el: input};

				self.setting.onPass(agent, data, scopeInfo);
			}, function(data){
				scopeInfo && ++scopeInfo.error;
				data.el = input;

				self.setting.onError(agent, data, scopeInfo);
				return returnReject({ele: agent, data: data});
			});
		},

		/**
		 * 静默地检查表单可用性，不会触发任何事件，用户可以用返回的类promise做后续流程操作。
		 * @return {Object} 类promise
		 */
		silentCheck: function() {
			var self = this;

			return $.when.apply($, $.map(self.$ipts.add(self.$gourps), function(ele) {
				return self.checkControl(ele);
			}));
		},

		/**
		 * 检查表单可用性，会在相应时机触发onGlobalError、onPass、onError事件
		 * 事件触发机制：首个错误的控件触发onError后，触发onGlobalError，继而触发其他控件的onPass或onError
		 * @return {Object} 类promise
		 */
		check: function() {
			var self = this,
				$ctrls = self.$ipts.add(self.$groups),
				eachInfo = {error: 0, info: 0, length: $ctrls.length},
				firstFire;

			function onGlobalError(data) {
				if (!firstFire) {
					firstFire = true;
					self.setting.onGlobalError(data.ele, data.data);
				}

				return returnReject(data);
			}

			return $.when.apply($, $.map($ctrls, function(ele) {
				return self.checkControlAndTriggetEvent(ele, eachInfo).then(undefined, onGlobalError);
			}))/*.then(undefined, function(data) {
				self.setting.onGlobalError(data);
				return returnReject(data);
			})*/;
		},

		destroy: function() {
			this.$tips.off('.cVerify'); //.removeData('verifyRule');
			this.$groups.off('.cVerify'); //.removeData('verifyRule');
			this.$tips = null;
			this.$form = null;
		}
	};

	Verify.defaultSetting = defaultSetting;
	Verify.defaultConfig = defaultConfig;

	(function() {
		/*function scrollToEle(ele, top, num) {
		    var num = (num||0) * 2,
		        $ele = $(ele),
		        t = $ele.offset().top - (top||0),
		        f = function (){
		            $ele.animate({opacity: num&1 ? 0: 1}, 150, (num-- > 0)?f:null);
		        };
		    ele && $("html").stop().animate({scrollTop: t}, "fast", (num-- > 0)?f:null) && $("body").stop().animate({scrollTop: t}, "fast");
		}*/

		$.extend(Verify.defaultSetting, {
			onError: function(ele, data) {
				$(ele).addClass('has-error');
			},

			onPass: function(ele, data) {
				$(ele).removeClass('has-error');
			},

			onGlobalError: function(ele, data) {
				// scrollToEle(ele, 50);
				ele.blur();
				ele.focus();
			}
		});
	})();

	return Verify;
}));
