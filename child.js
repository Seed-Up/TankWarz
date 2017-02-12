const vm = require('vm');
const context = new vm.createContext({
    console: {
        log: function() {}
    }
});

// Define the function to use
process.on('message', function(obj) {
    var data = obj.data;
    if (data.action == "code")
        vm.runInContext(data.code, context);
    else if (data.action == "execute") {
        try {
            var running = "main(" + JSON.stringify(data.argument) + ")";
            var result = vm.runInContext(running, context,{timeout: 500});
        } catch (e) {
            process.send({data: { action: "error", argument: JSON.stringify(e)}});
            return;
        }
        process.send({ data: { action: "result", argument: result }});
    }
});
