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

	<!-- 输入框为必填，且没有在注册过 -->
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
	// 进行表单验证后ajax提交表单内容
	formVerify.check().then(function() {
		$.post(formVerify.$form.attr('action'), formVerify.$form.serializeArray())
	});

	return false;
});
```
