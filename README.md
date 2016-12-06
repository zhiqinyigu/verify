# verify
一个基于jQuery的表单验证，只关注流程，不处理UI。

## 特点
- 在html声明要用的规则，在js中定义规则和提示
- deferred语法(基于$.Deferred)，使得规则可以是异步的
- 规则支持串联使用
- 支持“或”语法

## 起步
在html中定义要使用的规则
```html
<form id="myform" action="/submit">
	<!-- 输入框为必填 -->
	<input type="text" data-rule="required">

	<!-- 输入框为必填，且为手机号码格式 -->
	<input type="text" data-rule="required;mobile">

	<!-- 输入框为必填，且没有在服务器注册过 -->
	<input type="text" data-rule="required;checkNameUniqueness">
</form>
```

在js中定义规则和提示
```javascript
var formVerify = new Verify('#myform', {
	rules: {
		// 检查用户名的唯一性
		checkNameUniqueness: function(input) {
			return $.ajax('/api/', {
				name: input.value
			}).then(function(json) {
				if (json.status === 200) {
					// success
					return true;
				} else {
					// fail
					return new $.Deferred().reject(json.msg);
				}
			});
		}
	}
});

// 监听表单提交事件
formVerify.$form.on('submit', function() {
	// 进行表单验证，验证通过的话用ajax提交表单内容
	formVerify.check().then(function() {
		$.post(this.action, $(this).serializeArray())
	});

	return false;
});
```

## form表单提交
上面的例子演示了异步提交表单，但有时候我们需要直接form表单提交，处理也是很简单的：

```javascript
var isPass = false; // 先创建一个标记表示表单是否通过了表单验证

// 监听表单提交事件
formVerify.$form.on('submit', function() {
	if (isPass) {
		isPass = false; // 重置标记的状态。
		return true;
	} else {
		// 进行表单验证，验证通过的话用ajax提交表单内容
		formVerify.check().then(function() {
			isPass = true;
			$(formVerify.$form).trigger('submit');
		});

		return false;
	}
});
```

每次都要维护一个标记是繁琐的，verify.js提供了语法糖衣来实现相同的功能：

```javascript
new Verify('#myform', {
	onSubmit: function() {
		// 表单验证通过
		$(formVerify.$form).trigger('submit');
	},
	onIntercept: function(data) {
		// 表单验证失败
		console.log(data);
	}
});
```

当你传递onSubmit参数时，verify.js内部做了`formVerify.$form.on('submit', fn)`。
其中`fn`中进行了表单验证，验证通过后调用`onSubmit`，验证失败调用`onIntercept`。

## UI界面
verify.js虽然没有处理UI，但是暴露了相关接口协助开发者去处理。关键三个钩子函数：
onError：控件验证错误时调用
onPass：控件验证通过时调用
onGlobalError：只有调用`check()`来验证表单时才会触发。触发于首个错误的控件触发`onError`后。

所以三个钩子函数的触发机制是这样的（以调用`check()`为例）：首个错误的控件触发`onError`后，触发`onGlobalError`，继而触发其他控件的`onPass`或`onError`。

---

来看看verify.js默认对UI界面的简单处理：
```javascript
$.extend(Verify.defaultSetting, {
	onError: function(ele, data) {
		$(ele).addClass('has-error');
	},

	onPass: function(ele, data) {
		$(ele).removeClass('has-error');
	},

	onGlobalError: function(ele, data) {
		ele.blur();
		ele.focus();
	}
});
```

上面代码实现了：
1. 当有控件验证失败时，会给控件添加`.has-error`
2. 当有控件验证通过时，会取出控件的`.has-error`
3. 当对表单进行验证时，第一个没有通过验证的控件会获得焦点。
