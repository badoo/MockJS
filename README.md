MockJS
========

JavaScript object mocking library based on Mockito syntax for JS unit testing.
It goes a bit further by implementing some cool syntax you can achieve in JavaScript using ECMA5 object properties and allowing you to handle mocking global scope functions and match calls on different contexts.


**Installation**

- Include /src/Mock.js into your tests runtime
- Mock will automatically attach itself to the "window" scope (browser) if it exists

For specific unit testing tools:

- you can use Mock.hookTo(context); to import MockJS tools into your testing scope.
- Currently supports context = "screwunit", "JsUnitTest", "jsUnity", "jSpec", "JsTestDriver", "YUITest", "QUnit";

Or you can send your own context object:

```javascript
Mock.hookTo(MyTestingTool.globalTestScope);
```

Quick test / check:

- check and run /testception/index.html in your browser (outputs test results in console)
Note: the small *TestSuite* included in testception is a very simplistic tool used to test MockJS itself - MockJS is completely standalone.

Documentation
========
Documentation below is divided into 2 main sections:

- Mockito Classics - what you did in Mockito and how to do it in MockJS;
- MockJS Specifics - specific features for mocking JavaScript;

Docs 1. Mockito Classics
========
Your Mockito classics (rewritten directly from [Mockito's documentation](http://docs.mockito.googlecode.com/hg/latest/org/mockito/Mockito.html "Mockito's documentation")):

**<a href="#1">1</a>. Verify interactions**

```javascript
var mockArray = Mock([]);   //create the mock object

mockArray.push("one");

verify( Acts.once, mockArray.push("one") );
```

**<a href="#1">1</a>. Stubbing method calls**

```javascript
when( mockArray.push("one") ).thenReturn(1);

console.log( mockArray.push("one") );   //prints "1"

verify( Acts.once, mockArray.push("one") );
```

**<a href="#3">3</a>. Argument matchers**

```javascript
when( mockArray.push(Match.anything) ).thenReturn("hello!");

console.log( mockArray.push("one") );   //prints "hello!"
console.log( mockArray.push(999) );   //prints "hello!"
    
//look into 102. for more information
```

**<a href="#4">4</a>. Verifying exact number of invocations / at least x / never**

```javascript
verify( Acts.never, mockArray.push("one") );        //ok
    
mockArray.push("one");
verify( Acts.once, mockArray.push("one") );         //ok
verify( Acts.atLeast(1), mockArray.push("one") );   //ok
    
mockArray.push("one");
mockArray.push("one");
verify( Acts.atMost(2), mockArray.push("one") );    //fails
    
//look into 103. for more information
```

**<a href="#5">5</a>. Stubbing void methods with exceptions**

```javascript
when( mockArray.push(Match.anything) ).thenThrow("Hi, I am an expcetion");
    
mockArray.push("something");    //throws our exception
```

**<a href="#11">11</a>. Stubbing with callbacks**

```javascript
when( mockArray.push(Match.anything) ).thenReturn(function(arg){ 
    console.log("array.push('"+arg+"') called!");
    return "hello!"; 
});
    
console.log( mockArray.push("one") );   //prints "array.push('one') called!" and "hello!"
```    

**<a href="#12">12</a>. thenReturn() | thenThow() | thenAnswer() | thenNothing() | thenCallRealMethod() family of methods**

*Currently implemented:*

- thenReturn()
- thenThow()

*Not Yet Implemented:*

- thenNothing()
- thenCallRealMethod()

Unnecessary in JS: thenAnswer()

**<a href="#15">15</a>. Capturing arguments for further assertions**

//All return callbacks support it by default - take a look at example [11.](#11)

<!--
**<a href="#17">17</a>. Resetting mocks**
    
//Ongoing work

Mock.resetVerifies(mockArray [, context]);      \\will clear the number of calls (all methods), optionally on a specific context (see [101.](#101))
Mock.reset(mockArray [, context]);              \\will clear all stubs and number of calls
-->

**<a href="#18">18</a>. Troubleshooting & validating framework usage**

You should know that MockJS validates if you use it correctly **all the time**.
You have more questions please refer to our issues section on github.

**<a href="#26">26</a>. Mocking details**

```javascript
Mock.isMock(someObject);
```
   
*Not Yet Implemented:*

- Mock.isSpy 



Docs 2. MockJS specific features
=======

**<a href="#100">100</a>. Mock in-scope functions**

```javascript
function sum(a, b){
    return a+b;
}
    
var mockSum = Mock(sum);
    
mockSum(5, 5); //returns undefined (default)
```

**<a href="#101">101</a>. Match contexts**
    
```javascript
when( mockArray.push.apply(Match.anyContext, [Match.anything]) ).thenReturn("something");
    
mockArray.push.apply([], ["one"]);
    
verify( Acts.once, mockArray.push.apply(Match.anyContext, [Match.anything]) );
```
    
**<a href="#102">102</a>. Matchers (Match)**
    
```javascript
//argument matchers
Match.anyString         //argument is a string
Match.anyInt            //argument is an integer
Match.anyNumber         //argument is a number
Match.anyFunction       //argument is a function
Match.anything          //argument is not undefined  
    
Match.everything        //special matcher - all arguments from this point on will be accepted
                        //eg. when( foo("a", Match.everything) ) will match foo("a"), foo("a", "one"), foo("a", 1, 2, 3, 4, 5, 6);
                            
                            
//context matcher
Match.anyContext        //all contexts will be accepted
```
    
**<a href="#103">103</a>. Call Counters (Acts)**
    
```javascript
Acts.times(x);  //verifies call acted exactly x number of times
Acts.never      //never happens (short for Acts.times(0))
Acts.once       //acts once (short for Acts.times(1))
Acts.atLeast(x) //acts at least x times
Acts.atMost(x)  //acts at most x times
    
//Note: the following syntax should not be used:
var a = Acts.never
verify( a, foo() );                 //works 1st time
verify( a, foo("one") );            //throws unexpected action in MockJS on all further uses
    
    
verify( Acts.never, foo("one") );   //always use the complete API syntax
```
    

**<a href="#104">104</a>. Custom argument matchers**
    
```javascript
function myClass(){
}
    
var matchObjectClass = function(arg){
    return arg instanceof myClass;
}
    
when( foo(matchObjectClass) ).thenReturn("something");
    
foo(new myClass());  //returns "something"
    
verify( Acts.once, foo(matchObjectClass) ); //verifies correctly
```
    
**<a href="#105">105</a>. Save and restore global references**

```javascript
//let's consider our global function foo
var foo = function(a){
    alert(a);
    return "hello";
}
    
foo = Mock.andSave(foo, "myFoo");        //mocks function foo but keeps a reference for teardown (below)
    
when( foo(Match.anything) ).thenReturn("hello");
    
console.log( foo("hey") );         //prints "hello" into console
    
    
//teardown
foo = Mock.teardown("myFoo");    //sets foo back to the original function
    
foo("hey");         //alerts "hey"
```
    
**<a href="#106">106</a>. Mock.new() - create mocks for inacessible objects**

```javascript
//Consider the function we need to mock:
function $(a){ 
    var privateObject = {
        whisper:function(){
            console.log(a);
            return true;
        },
        say:function(){
            alert(a);
            return true;
        }   
    }
        
    return privateObject;
}
// Notice we cannot get a "mockable" instance of privateObject
// but we do know it is going to have a method "say"
    
//our function being tested
function iNeedTesting(){
    var check = $("hello");
        
    if(check.whisper() && check.say()) console.log("works!");
}
    
    
    
    
//let's mock the main wrapper
$ = Mock($);
    
var privateObject = Mock.new(["whisper", "say"]);       //create a mock object with methods "whisper" and "say"
    
when( $("hello") ).thenReturn(mockPrivateObject);
when( privateObject.whisper() ).thenReturn(true);
when( privateObject.say() ).thenReturn(true);
    
iNeedTesting(); //run our function being tested - prints out "works!" to console
    
verify(Acts.once, $("hello"));
verify(Acts.once, privateObject.whisper());
verify(Acts.once, privateObject.say());
    
//all ok
```
    

Other Mockito features status
========
Stuff on Mockito documentation that we haven't implemented yet

- **6. Verification in order**
- **7. Making sure interaction(s) never happened on mock**
- **8. Finding redundant invocations**
- **10. Stubbing consecutive calls (iterator-style stubbing)**
- **13. Spying on real objects**
- **14. Changing default return values of unstubbed invocations**
- **16. Real partial mocks**
- **17. Resetting mocks**
- **19. Aliases for behavior driven development**
- **20. Serializable mocks**
- **21. New annotations: @Captor, @Spy, @InjectMocks** *//Note: Probably Not Applicable*
- **22. Verification with timeout**
- **23. Automatic instantiation of @Spies, @InjectMocks and constructor injection goodness** *//Note: Probably Not Applicable*
- **24. One-liner stubs**
- **25. Verification ignoring stubs**
- **27. Delegate calls to real instance** *//Note: Probably Not Applicable*
- **28. MockMaker API** *//Note: Probably Not Applicable*

Something extra we would like to do:

- **107. Make it available as a npm package (Node.js)**

Pull requests anyone? :p

Credits
=====

This special cocktail is brought to you by [Badoo Trading Limited](http://corp.badoo.com "Badoo Trading Limited") and it is released under the [MIT License](http://copyfree.org/licenses/mit/license.txt "MIT License") 

Created by [Carlos Ouro](https://github.com/carlosouro/ "Carlos Ouro")