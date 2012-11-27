//MockJS Mocking Framework
//Created by Carlos Ouro @ Badoo Trading Limited - http://corp.badoo.com 
//Released under the MIT License
//
//requires ECMA5 compatible environment (Object.create, Object.defineProperties)
//
var Mock = (function(){
    
    "use strict"
    
    //allow breakpoint debug on functions
    var isStrict = (function() { return !this; })();    //debug (workaround strict breakpoints issue)
    //var isStrict = false; //live
    
    //SUPER NOTE:
    //functions have default scope undefined
    //however, window context is assigned when executed on a browser breakpoint
    //here we consider the core javascript undefined scope, 
    //but this may sometimes cause confusion if you require breakpoint debugging
    
    //internal objects
    var everythingObj={};
    var myFalse = {};
    var mockCreator = function(){}
    
    //notifications across objects
    var tempMockData = null;
    var tempMockIndex = null;
    var verifyCondition = null;
    
    //developer code consistency check
    var Action = {
        GET_CALL:0,
        SET_CALL:1,
        WHEN:2,
        RETURN:3,
        VERIFY:4,
        ACTS:5,
        CHECK_CALLS:6,
        name:function(action){
            for (var el in this){
                if(this[el] == action) return el;
            }
        }
    }
    var Expect = {
        AFTER_SET_CALL : [Action.WHEN, Action.GET_CALL, Action.SET_CALL, Action.ACTS],
        AFTER_GET_CALL : [Action.GET_CALL, Action.SET_CALL, Action.ACTS],
        AFTER_WHEN : [Action.RETURN],
        AFTER_ACTS : [Action.CHECK_CALLS],
        AFTER_CHECK_CALLS : [Action.VERIFY],
        NORMAL : [Action.GET_CALL, Action.SET_CALL, Action.ACTS],
        name:function(expectation){
            for (var el in this){
                if(this[el] == expectation) return el;
            }
        }
    }
    var expectations = Expect.NORMAL;
    function checkConsistency(thisAction){
        if(expectations.indexOf(thisAction)==-1){
            throw new Error("MockJS: unexpected action - expected "+Expect.name(expectations)+", got "+Action.name(thisAction)+".");
        }
    }
    
    //return object for when()
    var WhenWhat = {
        prop:null,
        //to extend when(mock.action()).method()
        //just add your methods here
        thenReturn:function(ret){
            checkConsistency(Action.RETURN);
            this.prop.returns[this.returnIndex]=ret;
            expectations = Expect.NORMAL;
        },
        thenThrow:function(except){
            checkConsistency(Action.RETURN);
            this.prop.returns[this.returnIndex]=function(){throw new Error(except);};
            expectations = Expect.NORMAL;
        }
    }
    
    //Mock object creator
    var isHooked = false;
    var mockPropData = function(isFunction){
        this.isFunction = isFunction;
        this.contexts=[];
        this.mocks=[];
    }
    var Mock = function(obj){
        
        //hook
        if(!isHooked) Mock.hookTo(window);
        
        if (typeof obj == 'function'){
            //mock our function
            return methodReplacement(obj, new mockPropData(true));
            
        } else if(typeof obj == 'object' && obj!= null) {
            //mock our object
            
            //our mock object
            var mockProps = new mockCreator();
            //let's check all object properties
            var objProps = Object.getOwnPropertyNames(obj);
            for(var i = objProps.length-1; i>=0; i--){
                var el = objProps[i];
                //functions
                if(typeof obj[el] == 'function'){
                
                    mockProps[el] = {
                        value:methodReplacement(el, new mockPropData(true))
                    }
                
                //ignore all other props for now
                //TODO: use setters and getters to apply the same logic to other properties
                
                }
            }
            
            //return the new mocked object
            return Object.create({}, mockProps);
            
        } else {
            throw new Error("MockJS: Mocking type \""+(typeof obj)+"\" is unsupported.");
        }
    };
    //helper public methods
    
    //Checks if given object is a mock object
    Mock.isMock=function(obj){
        return obj instanceof mockCreator;
    }
    
    
    /*
    Hooks the Mock and test methods to specific unit test frameworks or scope
        
    Eg: 
    Mock.hookTo("screwunit");   //screwunit, JsUnitTest, jsUnity, jSpec, JsTestDriver
    Mock.hookTo(myPopWindow);   //a scope object
    */
    Mock.hookTo=function(what){
        switch(what){
            case "screwunit":
                exportTo(Screw.Matchers);
                break;
            case "JsUnitTest":
                exportTo(JsUnitTest.Unit.Testcase.prototype);
                break;
            case "jsUnity":
                exportTo(jsUnity.env.defaultScope);
                break;
            case "jSpec":
                exportTo(jSpec.defaultContext);
                break;
            case "JsTestDriver":
            case "YUITest":
            case "QUnit":
                exportTo(window);
                break;
            default:
                if(what && typeof what == 'object'){
                    exportTo(what);
                } else exportTo(window);
        }
        isHooked = true;
    }
    
    //new() method creates a mock for a non-accessible object using array entries as the methods to be considered for replacement
    Mock.new=function(arr){
        var newObj = {};
        for(var i = arr.length-1; i>=0; i--){
            newObj[arr[i]] = function(){}  //create empty methods
        }
        return Mock(newObj);
    }
    
    //andSave() method creates the mock but keeps a reference to the object so it can be used to reset it's value on teardown
    var savedObjs = {};
    Mock.andSave=function(obj, slot){
        savedObjs[slot] = obj;
        return Mock(obj);
    }
    
    
    //teardown helper - returns the saved object reference
    Mock.teardown=function(slot){
        var myObj = savedObjs[slot];
        delete savedObjs[slot]; //delete the reference here to avoid memory leaks
        return myObj;
    }
    
    //helper to check acts consistency
    function checkActsConsistency(){
        checkConsistency(Action.ACTS);
        //set expections
        verifyCondition = true;
        expectations = Expect.AFTER_ACTS;
    }
    
    //helper - exports framework to context
    function exportTo(obj){
        var props = {
            when:{
                value:function(property){
                    checkConsistency(Action.WHEN);
                    //check private variable keeping the matched property entry
                    if(!tempMockData) throw new Error("MockJS: when() requires a valid mock object with an unmatched method call");
                    WhenWhat.prop = tempMockData;
                    WhenWhat.returnIndex = tempMockIndex;  //always the last one is the one matched
                    //do not count this call
                    tempMockData.calls[tempMockIndex]--;
                    
                    tempMockData = null;    //reset tempMockData!
                    tempMockIndex = null;
  
                    expectations = Expect.AFTER_WHEN;   //set temporary error
                    WhenWhat.thenThrow("MockJS: Case when() matched, but you forgot the assign what should be returned...");
                    expectations = Expect.AFTER_WHEN;   //setill we expect an AFTER_WHEN
                    return WhenWhat;
                }
            },
            verify:{
                value:function(validateCallback, actionedTimes){
                    checkConsistency(Action.VERIFY);
                    //expectation
                    expectations = Expect.NORMAL;
                    //verify the given condition
                    validateCallback(actionedTimes);
                }
            },
            Match:{
                value:{
                    //add your shortened callback checks here
                    anyString:function(val){ return typeof val == "string";},
                    anyInt:function(val){ return typeof val == "number" && parseInt(val)==val;},
                    anyNumber:function(val){return typeof val == "number";},
                    anyFunction:function(val){return typeof val == 'function';},
                    anything:function(val){return val != undefined;},
                    
                    //special matcher - all contexts will be accepted
                    anyContext:everythingObj,
                    //special matcher - all arguments from this point on will be accepted
                    everything:everythingObj
                }
            },
            Acts:{
                value:Object.create(Object.prototype, {
                    //verification callbacks here
                    never:{
                        get:function(){
                            checkActsConsistency();
                            return function(times){ 
                                if(times!=0) throw new Error("Expected never, called "+times+" times."); 
                            }
                        }
                    },
                    once:{
                        get:function(){
                            checkActsConsistency();
                            return function(times){ 
                                if(times!=1) throw new Error("Expected once, called "+times+" times."); 
                            }
                        }
                    },
                    times:{
                        value:function(number){
                            checkActsConsistency();
                            return function(times){ 
                                if(times!=number) throw new Error("Expected times("+number+"), called "+times+" times."); 
                            }
                        }
                    },
                    atLeast:{
                        value:function(number){
                            checkActsConsistency();
                            return function(times){ 
                                if(times<number) throw new Error("Expected atLeast("+number+"), called "+times+" times."); 
                            }
                        }
                    },
                    atMost:{
                        value:function(number){
                            checkActsConsistency();
                            return function(times){ 
                                if(times>number) throw new Error("Expected atMost("+number+"), called "+times+" times."); 
                            }
                        }
                    }
                })
            }
        }
        
        //set all properties in scope
        if(!obj.hasOwnProperty("Mock")) props.Mock={value:Mock};  //check if Mock is already in scope
        for(var el in props){
            Object.defineProperty(obj, el, props[el]);
        }
        
    }
    
    //method / function replace
    function methodReplacement(el, propData){
        return function(){
                            
            //check if context exists
            var contextIndex, mockData, context;
            
            //WORKAROUND NOTE:
            //functions have default scope window
            //however, undefined context is assigned when executed 
            //on strict mode, except if dive into a breakpoint on web inspector
            if(this==window || (isStrict && this==undefined)){  
                context = 'window';
            } else {
                context = this;
            }
            
            //get the context of this call
            contextIndex = propData.contexts.indexOf(context);
            //special case - let's test if there is a specific context call
            if(contextIndex==-1) contextIndex = propData.contexts.indexOf(everythingObj);
            
            
            //get the mock data form this context call
            if(contextIndex!=-1) {
                mockData = propData.mocks[contextIndex];
                                
            //create new context entry if it does not exist
            } else {
                propData.contexts.push(context);
                mockData = {
                    noArgsIndex: null,
                    args: [],
                    returns: [],
                    calls:[]
                }
                propData.mocks.push(mockData);
            }
            
            
            
            //save global tempMockData for when()
            tempMockData = mockData;
                            
            //get mode - we have a match and return the value - tempMockData remains null
            var ret = checkCallArgs(mockData, arguments);
            if(ret!=myFalse) {
                //set the tempMockIndex
                tempMockIndex=ret;
                
                if(!verifyCondition){
                    //make sure this is it
                    checkConsistency(Action.GET_CALL);
                    //increase number of calls
                    mockData.calls[ret]++;
                    //return value or execute callback
                    expectations = Expect.AFTER_GET_CALL;
                    return typeof mockData.returns[ret] == 'function' ? 
                        mockData.returns[ret].apply(this, arguments) : 
                        mockData.returns[ret] ;
                }
            } else {
                
                //push the argument matchers
                mockData.args.push(arguments);
            
                //set the tempMockIndex
                tempMockIndex=mockData.args.length-1;
                                        
                //special case - empty arguments matches automatically this case
                //Note also foo(Match.everything) counts
                if(arguments.length==0 || arguments[0]==everythingObj) mockData.noArgsIndex = tempMockIndex;   
                //set defaults
            
                mockData.returns.push(undefined);
                
                
                if(!verifyCondition){
                    mockData.calls.push(1);
                    //make sure this is it
                    checkConsistency(Action.SET_CALL);
                    //set expectations
                    expectations = Expect.AFTER_SET_CALL;
                    return undefined;   //always return undefined when no match is given
                } else {
                    mockData.calls.push(0);
                }
            }
            
            //make sure this is it
            checkConsistency(Action.CHECK_CALLS);
            //set expections
            verifyCondition=null;
            expectations = Expect.AFTER_CHECK_CALLS;
            
            var times = tempMockData.calls[tempMockIndex];
            tempMockData=null;
            tempMockIndex=null;
            return times;
        }
    }
    
    //main call matcher
    function checkCallArgs(prop, args){
        //special no arguments case
        if(args.length==0) {
            if(prop.noArgsIndex!=null) return prop.noArgsIndex;
        } else {
                
                
            //match arguments
            for(var i=0; i<prop.args.length; i++){
                var matchArgs = prop.args[i];
                //start as a match (except if no matching args exists at all)
                var isMatch = matchArgs.length>0 ? true : false;
                //loop through actual called arguments
                for(var j=0; j<matchArgs.length; j++){
                    //special match all immediate match
                    if(matchArgs[j] == everythingObj) break;  
                    //too many arguments - no match
                    if(args.length==j){
                        isMatch=false;
                        break;
                    }
                    //test callback match
                    if(typeof matchArgs[j] =='function') {
                        if(matchArgs[j](args[j])) continue; //argument match
                        //no match
                        isMatch=false;
                        break;
                    }
                    //test actual value
                    if(args[j] == matchArgs[j]) continue; //argument match
                    //no match
                    isMatch=false;
                    break;
                }
                //check if there was a match
                if(isMatch) return i;
            }
        }
        //no match
        return myFalse;
    }
    
    //return Mock
    return Mock;
})()

//if available, hook Mock to window by default - (all other methods will be automatically added if necessary)
if(window) Object.defineProperty(window, "Mock", {value:Mock});