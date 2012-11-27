//Simple Test Suite to show off MockJS Capabilities
//Pure simple javascript (ECMA5)

TestSuite = (function(){
    //test case base object
    var testCaseProperties = {
        name:{
            value:null,
            writable:true
        },
        timeout:{
            value:0,
            writable:true
        },
        failed:{
            value:false,
            writable:true
        },
        run:{
            value:function(){
                testSuite.log(this.name, "----- Started! -----");
                var firstTest = true;
                for(var el in this){
                    if(el.indexOf("test")==0){
                        
                        try {
                            if(this.setup) this.setup();
                            this[el]();
                            if(this.teardown) this.teardown();
                        } catch(e){
                            this.failed = true;
                            TestSuite.exception(this.name, e);
                        }
                        
                    }
                }
                
        
                //sync
                if(!this.timeout) this.finish();
                //async
                else this.setTimeout();
            }
        },
        setTimeout:{
            value:function(){
                var that = this;
                this.timeoutHandler = setTimeout(function(){
                    that.failed = true;
                    TestSuite.exception("TestCase timed out ("+that.timeout+"ms)");
                    that.finish();
                }, that.timeout);
            }
        },
        finish:{
            value:function(){
                if(this.timeoutHandler) clearTimeout(this.timeoutHandler);
                if(this.failed) {
                    TestSuite.exception(this.name, "----- Error! Test failed: "+this.name+" -----");
                }
                else TestSuite.log(this.name, "----- Passed! -----");
                TestSuite.output(this.name);
            }
        },
        assert:{
            value:function(bool, what){
                if(!bool) {
                    this.failed=true;
                    TestSuite.exception(this.name, what);
                } else {
                    TestSuite.log(this.name, what+" - OK");
                }
            }
        },
        log:{
            value:function(info){
                TestSuite.log(this.name, info);
            }
        },
        exception:{
            value:function(exception){
                this.failed=true;
                TestSuite.exception(this.name, exception);
            }
        },
        shouldFail:{
            value:function(callback, info){
                try{
                    callback();
                } catch(e){
                    this.log(info);
                    return true;
                }
                
                throw new Error(info);
            }
        }
    }
    
    //Test suite manager
    var tests={}, logStacks={}, dumpingStacks=[];
    var customException = function(caseName, exception){
        //console.log("Exception on "+caseName);
        throw exception;
    }
    var customLog = function(caseName, notice){
        console.log(caseName +": "+ notice);
    }
    var testSuite = Object.create(Object.prototype, {
        
        //public method to set custom loggers
        setLoggers:{
            value:function(log, exception){
                customLog = log;
                customException = exception;
            }
        },
        
        //log output proxy
        outputLog:{
            value:function(caseName, notice){
                customLog.apply(this, [caseName, notice]);
            }
        },
        outputException:{
            value:function(caseName, exception){
                customException.apply(this, [caseName, exception]);
            }
        },
        
        //add a testcase
        addTest:{
            value:function(name, o){
                if(tests[name]) throw new Error("Test \""+name+"\" already exists!");
                tests[name]=Object.create(o, testCaseProperties);
                tests[name].name = name;
            }
        },
        addAsyncTest:{
            value:function(name, o, timeout){
                timeout = timeout || 2500;
                testSuite.addTest(name, o);
                tests[name].timeout = timeout;
            }
        },
        
        //run all test cases
        runAll:{
            value:function(debug){
                console.log("Running all tests:");
                for(var el in tests) {
                    logStacks[el]=[];
                    setTimeout((function(f){
                        return function(){
                            f.run();
                        }
                    })(tests[el]),0); //run on "separate threads"
                }
            }
        },
        
        
        //output log for a test case
        output:{
            value:function(el){
                var that = this;
                while(logStacks[el].length>0){
                    //avoid problems in the stack
                    setTimeout((function(el, e){
                        return function(){
                            if(e.exception){
                                that.outputException(el, e.value);
                            } else {
                                that.outputLog(el, e.value);
                            }
                        }
                    })(el, logStacks[el].shift()),0);
                }
            }
        },
        
        //internal exception and log loggers
        exception:{
            value:function(el, e){
                logStacks[el][logStacks[el].length] = {exception:true, value:e}
            }
        },
        log:{
            value:function(el, e){
                logStacks[el][logStacks[el].length] = {exception:false, value:e}
            }
        }
    });
    
    return testSuite;
})()

