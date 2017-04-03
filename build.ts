import Command from "nifty-cmd"
import readFile = require("fs-readfile-promise")
import fsp = require("fs-promise")
var path = require('path');

var compiler = "g++"
var flags = "-m32 -c -std=c++11 -Wall -Wextra -Werror"
var include = "-I D:\\Programs\\vulkan\\1.0.37.0\\Include"
var libs = "-L D:\\Programs\\vulkan\\1.0.37.0\\Bin32 -lvulkan-1"

var getTime = async(file)=>{
	try{
		var stats = await fsp['stat'](path.join(__dirname,file))
		return stats.mtime.getTime()
	}catch(e){
		return -1;
	}
}

var build = async(obj)=>{
	var needBuild = false;

	if(obj.cmd){
		//get the last modified time of the file being built to compare against dependencies
		var time = await getTime(obj.name)
		if(time == -1){
			needBuild = true
		}

		//build all dependencies if needed, build this if any dependencies needed to be built
		for(var i = 0;i<obj.dep.length;i++){
			//console.log(obj.dep[i])
			var thisFileTime = await getTime(obj.dep[i])
			var built = await build(obj.dep[i])
			needBuild = needBuild || built || (thisFileTime > time)
		}

		//Debug
		//console.log(obj.name+":  "+modTime+" "+time+" "+(modTime > time)+" "+needBuild)

		if(needBuild){
			//build and print output
			console.log("Building: "+obj.name+":  "+obj.cmd)
			var command = new Command(obj.cmd, {log: true});
			var result:any = await command.run()
			//console.log(result.stdout)
			//console.log(result.stderr)
			return true
		}else{
			return false
		}
	}else{
		//object files rely on cpp and header files
		var match = obj.match(/(.*)\.o$/)
		if(match){
			var o = match[1]+".o"
			var cpp = match[1]+".cpp"
			var h = match[1]+".h"
			return await build({
				name: o,
				dep: [cpp, h],
				cmd: compiler+" "+flags+" -o "+o +" -c "+cpp + " "+include+" "+libs
			})
		}

		//cpp and header files rely on lzz files, these are intermidiate files so I just build lzz file here
		match = obj.match(/(.*)\.cpp$/)
		match = match ? match : obj.match(/(.*)\.h/)
		if(match){
			var file = match[0]
			var lzz = match[1]+".lzz"
			var dep = await getLzzDep(lzz)
			dep.push(lzz)
			return await build({
				name: file,
				dep: dep,
				cmd: "lzz "+lzz
			})
		}

		//console.log("No build for: "+ obj);
		return false;
	}
}

//gets the header files that the lzz file depends on
var getLzzDep = async(lzzFile)=>{ 
	var res = await readFile(lzzFile)
	var lines = res.toString().split("\n")
	var dep = lines.map((l)=>{
		var match = l.match(/#include \"(.*)\"/)
		var matchIgnore = l.match(/\/\//)
		if(match && !matchIgnore){
			return match[1]
		}else{
			return ""
		}
	}).filter((s)=>{return s != ""})
	return dep
}

var main = async()=>{
	var target = process.argv[2]
	if(!target){
		target = "main"
	}
	var make = {
		main: {
			name: "main.exe",
			dep: ["main.o", "src/vulkanHelper.o"],
			cmd: compiler+" -o main main.o src/vulkanHelper.o "+include+" "+libs
		},
		gyp: {
			name: "build",
			dep: ["bindings.cpp"],
			cmd: "node-gyp build"
		}
	}
	await build(make[target])
}
main()