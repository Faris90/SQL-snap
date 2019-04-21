/*

	sql

	sql and some other extensions for SNAP!
    © 2014 by Eckart Modrow. All rights reserved.
    emodrow@informatik.uni-goettingen.de

    based on morphic.js, objects.js, blocks.js and threads.js
    
    This file is an extension of Snap!.
    Thanks to Jens Moenig for his great work!

    Snap! is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as
    published by the Free Software Foundation, either version 3 of
    the License, or (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.

*/

//some functions to create, change, read and destroy dynamic variables and to alter the stagesize
//used to generate variables with table- and colums-names of an database
//the values of the variables correspond to their names
// globals from objects.js:
/*global SpriteMorph*/

  SpriteMorph.prototype.doMakeDynamicVariable = function (varName){
    if(varName.length > 0){
        var ide = this.parentThatIsA(IDE_Morph);
        this.addVariable(varName,true);
        ide.refreshPalette();
    }
  };

  SpriteMorph.prototype.doSetDynamicVariable = function (varName,value){
    if(varName.length > 0){
       var ide = this.parentThatIsA(IDE_Morph);
       var frame = this.variables;
       frame.vars[varName] = value;
   }
  };
  
  SpriteMorph.prototype.reportGetDynamicVariable = function (varName) {
    if(varName.length > 0){
       var ide = this.parentThatIsA(IDE_Morph);
       var frame = this.variables;
       return frame.vars[varName];
   }
};

  SpriteMorph.prototype.doDeleteDynamicVariable = function (varName){
    if(varName.length > 0){
       this.deleteVariable(varName,true);
       this.deleteVariable(varName,true);  //to avoid some occuring errors
   }
  };
  
  SpriteMorph.prototype.doChangeStagesize = function (x,y){
    var ide = this.parentThatIsA(IDE_Morph);
    StageMorph.prototype.dimensions = new Point(x, y); 
    ide.toggleStageSize(false);
  };
  
// functions to read and write RGB-values of a point
// setRGB writes on the penTrails-image
// getRGB reads the values of the stage or pentrails image and overwrites the values with the penTrails-image if existing
// globals from threads.js:
/*global Process*/

  Process.prototype.reportGetRGB = function (x,y,image) {
    if(!(image==='stage')) image = 'pentrails';
    var thisObj = this.homeContext.receiver,
    stage = thisObj.parentThatIsA(StageMorph),
    ext = stage.extent(),
    newX = Math.floor(stage.center().x + (+x || 0) * stage.scale - stage.position().x),
    newY = Math.floor(stage.center().y - (+y || 0) * stage.scale - stage.position().y),
    data,array,ctx;
    if(newX>=0 && newX<ext.x && newY>=0 && newY<ext.y) {
      if(image==='stage'){
        ctx = stage.image.getContext('2d');
      }
      else{
        ctx = stage.penTrails().getContext('2d');
      }
      ctx.scale(1 / stage.scale, 1 / stage.scale);
      data = ctx.getImageData(newX, newY, 1, 1);
      array = new Array(data.data[0],data.data[1],data.data[2]);
      return new List(array);
     }
     else return null;
};

Process.prototype.reportRGBtoHSV = function (r,g,b) {
    var max, min, h, s, v, d,array,
        rr = r / 255,
        gg = g / 255,
        bb = b / 255;
    max = Math.max(rr, gg, bb);
    min = Math.min(rr, gg, bb);
    d = max-min;
    if (max === min) h = 0;
    else if (max === rr) h = (gg - bb) / d + (gg < bb ? 6 : 0);
    else if(max === gg) h = (bb - rr) / d + 2;
    else h = (rr - gg) / d + 4;
    h = h / 0.06;
    s = max*100;
    v = max*100;
    array = new Array(Math.floor(h),Math.floor(s),Math.floor(v));
    return new List(array);
};

Process.prototype.doSetRGB = function (r,g,b,x,y,image) {
    var thisObj = this.homeContext.receiver,
        stage = thisObj.parentThatIsA(StageMorph),
        ext = stage.extent(),
        newX = Math.floor(stage.center().x + (+x || 0) * stage.scale - stage.position().x),
        newY = Math.floor(stage.center().y - (+y || 0) * stage.scale - stage.position().y),
        ctx;
        if(newX>=0 && newX<ext.x && newY>=0 && newY<ext.y) {
        if(image==='stage'){
           ctx = stage.image.getContext('2d');
        }
        else{
           ctx = stage.penTrails().getContext('2d');
        }
           ctx.scale(1 / stage.scale, 1 / stage.scale);
           ctx.beginPath(); 
           ctx.lineWidth = 1;
           ctx.strokeStyle = new Color(r,g,b).toString();
           ctx.moveTo(newX,newY);
           ctx.lineTo(newX+1,newY);
           ctx.closePath();
           ctx.stroke();
           stage.changed();
        }

};

//some functions to manage queries for a mySQL-database

// globals from threads.js:
/*global Process*/

//vars for optional connection to other servers
//global connection stores some information about just loaded data
//if a new connection is chosen, the old values are erased

var connection = {
    ok: false, 
    SQLmessage: 'not connected',
    server: '',
    user: '',
    password: '',
    database: '',
    table: '',
    databases: null,
    tables: null,
    columns: null,
    theSprite: null, //for trans-class access
    theProcess: null,
    theDBvars: []   //created dynVars   
    };

Process.prototype.getTables = function(){ //loads the table-list from server
   var tbls='';
   if(connection.server === 'snapextensions.uni-goettingen.de') 
       tbls = this.reportURL('snapextensions.uni-goettingen.de/mysqlquery.php?type=getTables&command=SHOW TABLES FROM '+connection.database);
   else       
       tbls = this.reportURL(connection.server+'/mysqlquery.php?type=getTables&command=SHOW TABLES FROM '+connection.database+'&server='+connection.server+'&user='+connection.user+'&password='+connection.password);
   tbls = new String(tbls);
   tbls = tbls.substring(0,tbls.length-1);
   connection.tables = new List(tbls.split('\n'));
   return connection.tables;
};

Process.prototype.getColumns = function(tname){ //loads the columns of table tname
   var mycolumns='';
   if(connection.server === 'snapextensions.uni-goettingen.de') 
       mycolumns = this.reportURL('snapextensions.uni-goettingen.de/mysqlquery.php?type=getColumns&command=SHOW COLUMNS FROM '+tname+'&database='+connection.database);
   else       
       mycolumns = this.reportURL(connection.server+'/mysqlquery.php?type=getColumns&command=SHOW COLUMNS FROM '+tname+'&database='+connection.database+'&server='+connection.server+'&user='+connection.user+'&password='+connection.password);
   mycolumns = new String(mycolumns);
   mycolumns = mycolumns.substring(0,mycolumns.length-1);
   connection.table = tname;
   connection.columns = new List(mycolumns.split('\n'));
   return connection.columns;
};

Process.prototype.execQuery = function(query){ //executes a sql-query
   var answer='';
   if(connection.server === 'snapextensions.uni-goettingen.de') 
       answer = this.reportURL('snapextensions.uni-goettingen.de/mysqlquery.php?type=query&query='+query+'&database='+connection.database);
   else       
       answer = this.reportURL(connection.server+'/mysqlquery.php?type=query&query='+query+'&database='+connection.database+'&server='+connection.server+'&user='+connection.user+'&password='+connection.password);
   answer = new String(answer);
   answer = answer.substring(0,answer.length-1);
   return new List(answer.split('\n'));
};

Process.prototype.getDatabases = function(){ //loads the database-names from a server
  var dbs='';
  if(connection.server === 'snapextensions.uni-goettingen.de') 
         dbs = this.reportURL('snapextensions.uni-goettingen.de/mysqlquery.php?type=getDBs');
      else       
         dbs = this.reportURL(connection.server+'/mysqlquery.php?type=getDBs&server='+connection.server+'&user='+connection.user+'&password='+connection.password);
  dbs = String(dbs);
  dbs = dbs.substring(0,dbs.length-1);
  connection.databases = new List(dbs.split('\n'));
  return connection.databases;
};

Process.prototype.updateSQLmessage = function(lastMessage){ //sets the field in connection and updates the dynamic variable SQLmessage, if existing
    connection.SQLmessage = lastMessage;
    if(connection.theSprite)
       connection.theSprite.doSetDynamicVariable('lastSQLmessage',connection.SQLmessage);
};

Process.prototype.doConnectToServer = function (myserver,myuser,mypwd){ //connects to a server
   var dbs,answer = '';
   connection.ok = false;
   connection.SQLmessage = 'not connected';
   connection.server = myserver;
   connection.user = myuser;
   connection.password = mypwd;
   connection.database='';
   connection.table='';
   connection.databases = null;
   connection.tables=null;
   connection.columns=null;
   if(connection.server === 'snapextensions.uni-goettingen.de')
       answer = this.reportURL('snapextensions.uni-goettingen.de/mysqlquery.php?type=connect');
   else      
       answer = this.reportURL(connection.server+'/mysqlquery.php?type=connect&server='+connection.server+'&user='+connection.user+'&password='+connection.password);
   answer = String(answer);
   this.updateSQLmessage(answer.substring(0,answer.length-1));
   if(connection.SQLmessage.substring(0,2)==='ok') connection.ok = true;
   connection.theProcess = this;
};

Process.prototype.reportGetDatabases = function (){
  if(connection.ok===false){
      this.updateSQLmessage('ERROR: please connect to server first');
      return connection.SQLmessage;
  }
  else{
      this.updateSQLmessage('ok');
      return this.getDatabases();
  }
};

Process.prototype.doChooseDatabase = function (n){
   var tbls,result='';
   if(connection.server===''){
      this.updateSQLmessage('ERROR: please connect to server first');
  }
  else if(connection.databases === null){
      this.updateSQLmessage('ERROR: please get first all databases from server');
  };
  if(n<1||n>connection.databases.length+1){
      this.updateSQLmessage('ERROR: wrong number');
  }
  else{
      connection.database = connection.databases.asArray()[n-1];
      if(connection.server === 'snapextensions.uni-goettingen.de') 
          result = this.reportURL('snapextensions.uni-goettingen.de/mysqlquery.php?type=useDB&command=USE '+connection.database);
      else       
          result = this.reportURL(connection.server+'/mysqlquery.php?type=useDB&command=USE '+connection.database+'&server='+connection.server+'&user='+connection.user+'&password='+connection.password);
      this.updateSQLmessage('ok');
      connection.table='';
      connection.tables=null;
      connection.columns=null;
         }
};

Process.prototype.reportGetTables = function (){
   var tbls;
   if(connection.server===''){
      this.updateSQLmessage('ERROR: please connect to server first');
      return connection.SQLmessage;
  }
  else if(connection.database === ''){
      this.updateSQLmessage('ERROR: please choose database first');
      return connection.SQLmessage;
      }
       else{
          this.updateSQLmessage('ok');
          tbls = this.getTables();
          return connection.tables;
      }
};
    
Process.prototype.reportGetColumns = function (tname){
   if(connection.server===''){
     this.updateSQLmessage('ERROR: please connect to server first');
     return connection.SQLmessage;
   }
   else if(connection.database === ''){
           this.updateSQLmessage('ERROR: please choose database first');
           return connection.SQLmessage;
        }
        else if(connection.tables === null){
                 this.updateSQLmessage = 'ERROR: please get tables first';
                 return connection.SQLmessage;
             };
  if(!connection.tables.contains(tname)){
      this.updateSQLmessage('ERROR: unknown tablename');
      return connection.SQLmessage;
  }
  else{
      this.updateSQLmessage('ok');
      return this.getColumns(tname);
  }
};

SpriteMorph.prototype.doCreateDBvars = function (){
   var ide = this.parentThatIsA(IDE_Morph),myTables,myColumns,myName,i;
   if(connection.theProcess){
       var ide = this.parentThatIsA(IDE_Morph),myTables,myColumns,myName,i;
       if(!(Array(connection.theDBvars).some(function(x){return x ==='lastSQLmessage';}))){
          this.addVariable('lastSQLmessage',true);
          this.variables.vars['lastSQLmessage'] = connection.SQLmessage;
          connection.theDBvars.push('lastSQLmessage');
      }
       if(connection.tables !== null){
          myTables = connection.tables.asArray();
          for(i=0;i<myTables.length;i++){
              if(!(connection.theDBvars.some(function(x){return x ===myTables[i];}))){
                 this.addVariable(myTables[i],true);
                 this.variables.vars[myTables[i]] = myTables[i];
                 connection.theDBvars.push(myTables[i]);
                 }
          }
      }
       if(connection.columns !== null){
          myColumns = connection.columns.asArray();
          for(i=0;i<myColumns.length;i++){
              myName = connection.table+'.'+myColumns[i];        
              if(!(connection.theDBvars.some(function(x){return x ===myName;}))){
                 this.addVariable(myName,true);
                 this.variables.vars[myName] = myName;
                 connection.theDBvars.push(myName);
                 }
          }
      }
      ide.flushBlocksCache('variables');
      ide.refreshPalette();
   };
   connection.theSprite = this;
};

SpriteMorph.prototype.doDeleteDBvars = function (){
   var ide = this.parentThatIsA(IDE_Morph),varName,frame;
   while(connection.theDBvars.length>0){  //with all created var do ...
       varName = String(connection.theDBvars.pop());  //get one
       try{                                          //try to delete it
           frame =this.variables.find(varName);
           this.variables.deleteVar(varName);
       }
       catch(ex){
           if(connection.theProcess)
               connection.theProcess.updateSQLmessage('ERROR: unknown var-name');
           connection.theDBvars.push(varName);
           return;
        }
       try{          //sometimes a second try is necessary
           frame =this.variables.find(varName);
           this.variables.deleteVar(varName);
       }
       catch(ex){}       
   }
   ide.flushBlocksCache('variables'); //show the changed palette
   ide.refreshPalette();
};
   
//some reporters to produce strings for sql-queries   
Process.prototype.reportSQLequals = function (a,b){
   return a + " = " + b;
};
    
Process.prototype.reportSQLgreater = function (a,b){
   return a + " > " + b;
};
    
Process.prototype.reportSQLless = function (a,b){
   return a + " < " + b;
};
    
Process.prototype.reportSQLnot = function (a){
   return "NOT(" + a +")";
};
    
Process.prototype.reportSQLand = function (a,b){
   return "(" + a + " AND " + b + ")";
};
    
Process.prototype.reportSQLor = function (a,b){
   return "(" + a + " OR " + b + ")";
};
    
Process.prototype.reportSQLin = function (a,b){
   return a + " IN(" + b + ")";
};

Process.prototype.reportSQLavg = function (a){
   return " AVG(" + a + ")";
};

Process.prototype.reportSQLcount = function (a){
   return " COUNT(" + a + ")";
};

Process.prototype.reportSQLmax = function (a){
   return " MAX(" + a + ")";
};

Process.prototype.reportSQLmin = function (a){
   return " MIN(" + a + ")";
};

Process.prototype.reportSQLsum = function (a){
   return " SUM(" + a + ")";
};


//access to sql-execution
Process.prototype.reportExecSQLcommand = function (query){
   var result='';
   if(connection.server==='')
       return 'ERROR: please connect to server first';
   else if(connection.database === '')
            return 'ERROR: please choose database first';
        else{
            query = String(query);
            if(new List(query.split(':')).asArray()[0]==='ERROR')
                return query;
            else return this.execQuery(query);
            }
};
    
Process.prototype.reportSimpleSelect = function (what,myattribs,mytables,mycond){
  var result,i,help,ok;
  result = 'SELECT ';
  if(what==='*') result = result + '* FROM ';
  else{
      if(what==='DISTINCT')  result = result + 'DISTINCT ';
     help = myattribs.asArray();
     if(help.length>0){
         ok = false;
         for(i=0;i<help.length-1;i++) 
           if(help[i].length>0){
             result = result + help[i] + ',';
             ok = true;
         }
         if(help[help.length-1].length>0){
           result = result + help[help.length-1]+' FROM ';
           ok = true;
         }
         if(!ok){
             this.updateSQLmessage('ERROR: missing attributes');
             return connection.SQLmessage;
         }
     }
     else{
         this.updateSQLmessage('ERROR: missing attributes');
         return connection.SQLmessage;
     };
   };
   help = mytables.asArray();
   if(help.length>0){
         ok = false;
         for(i=0;i<help.length-1;i++) 
           if(help[i].length>0){
             result = result + help[i] + ',';
             ok = true;
         }
         if(help[help.length-1].length>0){
           result = result + help[help.length-1]+' WHERE ';
           ok = true;
         }
         if(!ok){
             this.updateSQLmessage('ERROR: missing tables');
             return connection.SQLmessage;
         }
     }
     else{
         this.updateSQLmessage('ERROR: missing tables');
         return connection.SQLmessage;
     };
   if(mycond) result = result + mycond;
   else result = result + 'true';
 return result;
     
};    

Process.prototype.reportFullSelect = function (what,myattribs,mytables,mycond,mygroupattribs,myhavcond,myorderattribs,how,mylimit){
  var result,i,help,ok,nextpart;
  result = 'SELECT ';
  if(what==='*') result = result + '* FROM ';
  else{
      if(what==='DISTINCT')  result = result + 'DISTINCT ';
     help = myattribs.asArray();
     if(help.length>0){
         ok = false;
         for(i=0;i<help.length-1;i++) 
           if(help[i].length>0){
             result = result + help[i] + ',';
             ok = true;
         }
         if(help[help.length-1].length>0){
           result = result + help[help.length-1]+' FROM ';
           ok = true;
         }
         if(!ok){
             this.updateSQLmessage('ERROR: missing attributes');
             return connection.SQLmessage;
         }
     }
     else{
         this.updateSQLmessage('ERROR: missing attributes');
         return connection.SQLmessage;
     };
   };
   help = mytables.asArray();
   if(help.length>0){
         ok = false;
         for(i=0;i<help.length-1;i++) 
           if(help[i].length>0){
             result = result + help[i] + ',';
             ok = true;
         }
         if(help[help.length-1].length>0){
           result = result + help[help.length-1]+' WHERE ';
           ok = true;
         }
         if(!ok){
             this.updateSQLmessage('ERROR: missing tables');
             return connection.SQLmessage;
         }
     }
     else{
         this.updateSQLmessage('ERROR: missing tables');
         return connection.SQLmessage;
     };
   if(mycond) result = result + mycond;
   else result = result + 'true';
   
   help = mygroupattribs.asArray();
   nextpart = ' GROUP BY ';
   if(help.length>0){
         ok = false;
         for(i=0;i<help.length-1;i++) 
           if(help[i].length>0){
             nextpart = nextpart + help[i] + ',';
             ok = true;
         }
         if(help[help.length-1].length>0){
           nextpart = nextpart + help[help.length-1]+' HAVING ';
           ok = true;
         }
         if(ok){
             result = result + nextpart;
             if(myhavcond) result = result + myhavcond;
             else result = result + 'true';
         }
     };

   help = myorderattribs.asArray();
   nextpart = ' ORDER BY ';
   if(help.length>0){
         ok = false;
         for(i=0;i<help.length-1;i++) 
           if(help[i].length>0){
             nextpart = nextpart + help[i] + ',';
             ok = true;
         }
         if(help[help.length-1].length>0){
           nextpart = nextpart + help[help.length-1];
           ok = true;
         }
         if(ok){
             result = result + nextpart;
             if((how ==='ASC') || (how ==='DESC')) result = result + ' ' + how;
         }
     };
   if(mylimit>0) result = result + ' LIMIT ' + mylimit;
   return result;   
};    

//access to textfiles on the server
//limited to one string 

Process.prototype.writeTextfile = function(mytext,myfilename){ 
   var answer = this.reportURL(connection.server+'/handleTextfile.php?type=write&content='+mytext+'&filename='+myfilename);
   answer = new String(answer);
   return answer.substring(0,answer.length-1);
};

Process.prototype.readTextfile = function(myfilename){ 
   var answer = this.reportURL(connection.server+'/handleTextfile.php?type=read&filename='+myfilename);
   answer = new String(answer);
   return answer.substring(0,answer.length-1);
};

Process.prototype.deleteTextfile = function(myfilename){ 
   var answer = this.reportURL(connection.server+'/handleTextfile.php?type=delete&filename='+myfilename);
   answer = new String(answer);
   return answer.substring(0,answer.length-1);
};

Process.prototype.doWriteTextfile = function (mytext,myfilename){
    var i = myfilename.indexOf('.');
    if(i<1) myfilename = './textfiles/'+myfilename + '.txt';
    else myfilename = './textfiles/'+myfilename.substring(0,i)+'.txt';
    if(connection.server===''){
     this.updateSQLmessage('ERROR: please connect to server first');
   }
   else{
      this.updateSQLmessage('ok');
      this.writeTextfile(mytext,myfilename);
  }
};

Process.prototype.reportReadTextfile = function (myfilename){
    var i = myfilename.indexOf('.');
    if(i<1) myfilename = './textfiles/'+myfilename + '.txt';
    else myfilename = './textfiles/'+myfilename.substring(0,i)+'.txt';
   if(connection.server===''){
     this.updateSQLmessage('ERROR: please connect to server first');
     return connection.SQLmessage;
   }
   else{
      this.updateSQLmessage('ok');
      return this.readTextfile(myfilename);
  }
};

Process.prototype.doDeleteTextfile = function (myfilename){
    var i = myfilename.indexOf('.');
    if(i<1) myfilename = './textfiles/'+myfilename + '.txt';
    else myfilename = './textfiles/'+myfilename.substring(0,i)+'.txt';
   if(connection.server===''){
     this.updateSQLmessage('ERROR: please connect to server first');
   }
   else{
      this.updateSQLmessage('ok');
      this.deleteTextfile(myfilename);
  }
};


//execution of JS-code generated by code-mapping (see objects.js: SpriteMorph.prototype.blockTemplates

Process.prototype.reportExecJScode = function(aContext){
        
    var stage, stagecontext, pentrailscontext, stagedata, pentrailsdata, _returnValue, ext,theCode;
    
    function getPoint(x,y,place){
        var newX = Math.floor(stage.center().x + (+x || 0) * stage.scale - stage.position().x),
            newY = Math.floor(stage.center().y - (+y || 0) * stage.scale - stage.position().y),
            offset = (newX+newY*stage.width())*4;
        if(newX>=0 && newX<ext.x && newY>=0 && newY<ext.y)
           if(place==='stage') 
                return  new List(new Array(stagedata.data[offset],stagedata.data[offset+1],stagedata.data[offset+2]));
           else return new List(new Array(pentrailsdata.data[offset],pentrailsdata.data[offset+1],pentrailsdata.data[offset+2]));
    };

    function setPoint(r,g,b,x,y,place){
        var newX = Math.floor(stage.center().x + (+x || 0) * stage.scale - stage.position().x),
            newY = Math.floor(stage.center().y - (+y || 0) * stage.scale - stage.position().y), context;
        if(newX>=0 && newX<ext.x && newY>=0 && newY<ext.y){
            if(place==='stage') context = stagecontext; else context = pentrailscontext;
            context.beginPath(); 
            context.lineWidth = 1;
            context.strokeStyle = new Color(r,g,b).toString();
            context.moveTo(newX,newY);
            context.lineTo(newX+1,newY);
            context.closePath();
            context.stroke();
        }
    };

    function setVariableNamesIn(s){
        var counter = 0, i = 0, j = 0, newCode = "";
        while(i<s.length){
           if(s.charAt(i) !== '#'){
             newCode = newCode + s.charAt(i);
             i++;
           }
           else{
             newCode = newCode + "i" + counter;
             j++;
             i = i + 2;
             if(j>2){
                 j = 0;
                 counter++;
             }
           }
        }
        return newCode;
    }

    function setReturnvalue(x){
       _returnValue = x;
    };
    
    _returnValue = 'ok';
    stage = this.homeContext.receiver.parentThatIsA(StageMorph);
    ext = stage.extent();
    stagecontext = stage.image.getContext('2d');
    pentrailscontext = stage.penTrails().getContext('2d');
    stagecontext.scale(1 / stage.scale, 1 / stage.scale);
    stagedata = stagecontext.getImageData(0,0,stage.width(),stage.height());
    pentrailscontext.scale(1 / stage.scale, 1 / stage.scale);
    pentrailsdata = pentrailscontext.getImageData(0,0,stage.width(),stage.height());
    stagecontext.lineWidth = 1;
    stagecontext.strokeStyle = new Color(0,0,0).toString();
    pentrailscontext.lineWidth = 1;
    pentrailscontext.strokeStyle = new Color(0,0,0).toString();
    
    if (aContext instanceof Context) {
        if (aContext.expression instanceof SyntaxElementMorph) {
           theCode = aContext.expression.mappedCode();
           theCode = setVariableNamesIn(theCode);
           eval(theCode);
           stage.changed();
           return _returnValue;
        };
    };
   return 'ERROR';
};


