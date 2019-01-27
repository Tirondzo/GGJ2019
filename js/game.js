(function (Phaser) {


    var SCALE = 3;
    var WIDTH = 240;
    var HEIGHT = 192;

    var game = new Phaser.Game(
            WIDTH*SCALE, HEIGHT*SCALE, 
            Phaser.AUTO, // The type of graphic rendering to use 
            // (AUTO tells Phaser to detect if WebGL is supported.
            //  If not, it will default to Canvas.)
            'phaser', // The parent element of the game
            {
                preload: preload, // The preloading function
                create: create,   // The creation function
                update: update,   // The update (game-loop) function
                render: render
            }
    );
    var debugTextures = {};
    var cursors;
    var spaceKey;

    function procGenDebugTexture(w,h,name,fill=false,fstyle='#FF3300',sstyle='#ffd900'){
        var bmd = game.make.bitmapData(w,h);
        var ctx = bmd.ctx;
        ctx.strokeStyle = sstyle;
        ctx.lineWidth = 5;
        ctx.strokeRect(0,0,w,h);

        ctx.fillStyle = fstyle;
        ctx.font = "10px Verdana";
        ctx.fillText(name,3,13);
        
        if(fill){
            ctx.fillStyle = fstyle;
            ctx.fillRect(0,0,w,h);
        }
        return bmd;
    }

    function preload() {
        game.scale.scaleMode = Phaser.ScaleManager.USER_SCALE;
	    game.scale.setGameSize(WIDTH,HEIGHT);
        game.scale.setUserScale(SCALE, SCALE);
        game.renderer.renderSession.roundPixels = true;
        Phaser.Canvas.setImageRenderingCrisp(game.canvas);
		
		
	    //game.load.image('back', 'assets/back.png');
        //game.load.image('coin', 'assets/coin.png');
        game.load.image('grass', 'assets/grass.png');
        game.load.spritesheet('cat', 'assets/cat.png',16,16);
        game.load.spritesheet('tree', 'assets/trees.png',16,48);
        game.load.spritesheet('pickup', 'assets/pickup.png',16,16);
        game.load.image('roof', 'assets/roof.png');
        game.load.image('room', 'assets/room.png');
        game.load.spritesheet('pickup_hud', 'assets/pickup_hud2.png',16,16);
        game.load.spritesheet('player', 'assets/player.png',16,24);

        game.load.spritesheet('bubble','assets/bubble.png',16,16)
        game.load.spritesheet('arrows', 'assets/arrow.png', 240, 50);

        game.load.spritesheet('reciept_item', 'assets/recipe_small.png', 10, 10);
        game.load.image('reciept', 'assets/recipe.png');
        //generate debug textures
        var graphics;

        //Home
        debugTextures['homeBase'] = procGenDebugTexture(100,100,"Home Base")

        //Home roof
        debugTextures['homeRoof'] = procGenDebugTexture(150,150,"Home Roof")
         
        //Tree trunk
        debugTextures['treeTrunk'] = procGenDebugTexture(10,50,"TreeT");

        //Tree foliage
        debugTextures['treeFoliage'] = procGenDebugTexture(50,50,"TreeF");

        //Player
        debugTextures['player'] = procGenDebugTexture(10,20,"",true);

        //Food
        debugTextures['food'] = procGenDebugTexture(30,30,"F");

        //BLANK FILL BG
        debugTextures['scFill'] = procGenDebugTexture(game.width,game.height,'',true,'#000000');

        cursors = this.input.keyboard.createCursorKeys();
        spaceKey = this.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
    }

    var ground;
    var player;
    var cat;
    var catAnim;
    var catMoving = false;
    var catLastMove = 0;
    var catMoveDuration = 1;

    var reciept;
    var homeGroup = new Array();
    var homeRoof, homeBase;

    var screenArea,
        protectedArea,
        regenerativeArea,
        lastRegion;

    var homeArea;
    var foodRestrictArea;
    var homePoint;

    var debugScreenArea,
        debugProtectedArea,
        debugRegenerativeArea;

    var trees = new Array()
        items = new Array();

    var screenFill;
    var hud;
    var hud_text = new Array(4);
    var pickedItems = [0,0,0,0];

    var sleeping;
    var wakingUp;
    var wakingDirLeft;

    var arrows;

    var sortableGroup;
    
    var bubble_follow = null;



    function create() {
        //game.physics.startSystem(Phaser.Physics.ARCADE);
        game.world.setBounds(0, 0, 1e9, 1e9);
        game.stage.backgroundColor = "#EEEEEE";
        
        sleeping = true;
        wakingUp = 0.0;
        wakingDirLeft = true;

        //Before screen
        ground = game.add.tileSprite(game.world.centerX-1e7/2,game.world.centerY-1e7/2,1e7,1e7,'grass');

        //Sortable
        sortableGroup = game.add.group(game.world, 'sortable'); //sortable is just a name

        //HOME
        homePoint = new Phaser.Point(game.world.centerX, game.world.centerY);
        homeArea = new Phaser.Rectangle(0,0,300,300).centerOn(homePoint.x, homePoint.y);

        foodRestrictArea = homeArea.clone().scale(3).centerOn(homePoint.x, homePoint.y);

        //var roomArea = new Phaser.Rectangle(0,0,120,33).centerOn(homePoint.x,homePoint.y+128/2-33/2);
        //game.world.setBounds(roomArea.x,roomArea.y,roomArea.width,roomArea.height);

        homeBase = sortableGroup.create(homePoint.x, homePoint.y, 'room');
        homeBase.anchor.set(0.5,98/128);

        homeRoof = sortableGroup.create(homePoint.x, homePoint.y + (128-98), 'roof');
        homeRoof.anchor.set(0.5,1);
        homeRoof.alpha = 0;
        homeGroup.push(homeBase);
        homeGroup.push(homeRoof);

        //PLAYER
        player = sortableGroup.create(homePoint.x - 32, homePoint.y + 19, 'player');
        player.anchor.set(0.5,1);
        //player.enableBody = true;
          
        game.physics.enable(player, Phaser.Physics.ARCADE);
        game.camera.follow(player);
        //player.body.collideWorldBounds = true;

        

        //CAT
        cat = sortableGroup.create(homePoint.x-7, homePoint.y+14, 'cat');
        cat.anchor.set(0,1);
        //catAnim = game.add.tween(cat);
        game.physics.enable(cat, Phaser.Physics.ARCADE);
        

        //RECIEPT ITEM
        reciept = sortableGroup.create(homePoint.x + 17, homePoint.y - 10 + 10, 'reciept_item');
        reciept.anchor.set(0,1);

        //Over screen
        screenFill = game.add.sprite(0,0,debugTextures['scFill']);
        screenFill.fixedToCamera = true;
        arrows = game.add.sprite(game.centerX, game.height-50, 'arrows');
        arrows.fixedToCamera = true;

        recieptLarge = game.add.sprite(0,0,'reciept');
        recieptLarge.fixedToCamera = true;
        recieptLarge.visible = false;

        //HUD
        hud = game.add.group();
        hud.fixedToCamera = true;
        hud.create(10,10,'pickup_hud');
        hud.create(50,10,'pickup_hud').frame = 1;
        hud.create(90,10,'pickup_hud').frame = 2;
        hud.create(130,10,'pickup_hud').frame = 3;
        hud_text[0] = game.add.text(29, 12, "0", { font: '12px Arial', fill: '#fff' });
        hud.add(hud_text[0]);
        hud_text[1] = game.add.text(29+40, 12, "0", { font: '12px Arial', fill: '#fff' });
        hud.add(hud_text[1]);
        hud_text[2] = game.add.text(29+40*2, 12, "0", { font: '12px Arial', fill: '#fff' });
        hud.add(hud_text[2]);
        hud_text[3] = game.add.text(29+40*3, 12, "0", { font: '12px Arial', fill: '#fff' });
        hud.add(hud_text[3]);
        hud.visible = false;

        //Player ANIMATIONS
        var playerFrameSpeed = 8;

        player.animations.add('right_idle',[0]);
        player.animations.add('right',[1,1,2,3,4,4,3,2],playerFrameSpeed,true);
        player.animations.add('right_pick',[0,5,0],playerFrameSpeed);
        player.animations.add('up_idle',[6]);
        player.animations.add('up',[7,7,8,9,10,10,9,8],playerFrameSpeed,true);
        player.animations.add('up_pick',[6,11,6],playerFrameSpeed);
        player.animations.add('left_idle',[12]);
        player.animations.add('left',[13,13,14,15,16,16,15,14],playerFrameSpeed,true);
        player.animations.add('left_pick',[12,17,12],playerFrameSpeed);
        player.animations.add('down_idle',[18]);
        player.animations.add('down',[19,19,20,21,22,22,21,20],playerFrameSpeed,true);
        player.animations.add('down_pick',[18,23,18],playerFrameSpeed);
        player.animations.add('sleep',[24,25],5,true);

        var catFrameSpeed = 4;
        cat.animations.add('idle', [0,1], catFrameSpeed, true);
        cat.animations.add('idle_hover', [2,3], catFrameSpeed, true);
        cat.animations.add('right', [4,5], catFrameSpeed, true);
        cat.animations.add('up', [6,7], catFrameSpeed, true);
        cat.animations.add('left', [8,9], catFrameSpeed, true);
        cat.animations.add('down', [10,11], catFrameSpeed, true);
        cat.animations.add('sleep', [12,13], catFrameSpeed, true);
        
        

        screenArea = new Phaser.Rectangle(0,0,game.width,game.height);
        protectedArea = screenArea.clone().scale(2);
        regenerativeArea = protectedArea.clone().scale(2);
        lastRegion = screenArea.clone().scale(.5);

        lastRegion.centerOn(player.body.position.x, player.body.position.y);

        debugScreenArea = screenArea.clone().centerOn(game.world.centerX, game.world.centerY);
        debugProtectedArea = protectedArea.clone().centerOn(game.world.centerX, game.world.centerY);
        debugRegenerativeArea = regenerativeArea.clone().centerOn(game.world.centerX, game.world.centerY);
    
        player.animations.play('sleep');
        cat.animations.play('sleep');
        
        
        bubble = game.add.sprite(0,0,'bubble');
        bubbleSpeed = 15;
        bubble.animations.add('zzz',[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14],bubbleSpeed);
        bubble.animations.add('happy',[15,16,17,18,19,20,21,22,23,24,25,26,27,28,29],bubbleSpeed);
        bubble.animations.add('scared',[30,31,32,33,34,35,36,37,38,39,40,41,42,43,44],bubbleSpeed);
        bubble.animations.add('love',[45,46,47,48,49,50,51,52,53,54,55,56,57,58,59],bubbleSpeed);
        bubble.animations.getAnimation('zzz').onComplete.add(function () { bubble.visible=false; }, this);
        bubble.animations.getAnimation('happy').onComplete.add(function () { bubble.visible=false; }, this);
        bubble.animations.getAnimation('scared').onComplete.add(function () { bubble.visible=false; }, this);
        bubble.animations.getAnimation('love').onComplete.add(function () { bubble.visible=false; }, this);
        
        
        bubble.visible=false;

    }

    var lastDirection = 0;
    var pressedL = false;
    var pressedR = false;
    var recieptPicked = false;
    var recieptShow = true;
    var recieptPoint;

    var picking = false;
    var pickingTime = 0;

    var gameStage = 0;

    function update() {
        //PICKING DISABLE
        if(picking)
            picking = (game.time.totalElapsedSeconds() - pickingTime < .3);

        //MOVEMENT
        if(gameStage!=6)
        if(!picking)
        if(!sleeping){
            if(cursors.left.isDown){ 
                player.body.velocity.x = -100;
            }else if(cursors.right.isDown){
                player.body.velocity.x = +100;
            }else{ 
                player.body.velocity.x = 0;
            }
            
            if(cursors.down.isDown){
                player.body.velocity.y = +100;
            }else if(cursors.up.isDown){ 
                player.body.velocity.y = -100;
            }else{ 
                player.body.velocity.y = 0;
            }

            if(cursors.left.isDown){
                lastDirection = 0;
                player.animations.play('left');
            }else if(cursors.right.isDown){
                lastDirection = 2;
                player.animations.play('right');
            }else if(cursors.up.isDown){
                lastDirection = 1;
                player.animations.play('up');
            }else if(cursors.down.isDown){
                lastDirection = 3;
                player.animations.play('down');
            }else{
                player.animations.play(['left_idle','up_idle','right_idle','down_idle'][lastDirection]);
            }
        }else{
            if(cursors.left.isDown){
                if(!pressedL)
                if(wakingDirLeft){
                    wakingUp+=10;
                    wakingDirLeft ^= true;
                }else{
                    //wakingUp *= .5;
                }
                pressedL = true;
            }else if(cursors.right.isDown){
                if(!pressedR)
                if(!wakingDirLeft){
                    wakingUp+=10;
                    wakingDirLeft ^= true;
                }else{
                    //wakingUp *= .5;
                }
                pressedR = true;
            }else pressedL = pressedR = false;
            wakingUp *= .99;

            screenFill.alpha = Phaser.Math.max(0,(100-wakingUp)/100 );
            if(wakingUp > 50){
                sleeping = false;
                screenFill.alpha = 0;
                arrows.alpha = 0;
                //gameStage => 1
                gameStage += 1;
            }
            arrows.frame = wakingDirLeft ? 1 : 0;
        }


        sortableGroup.sort('y');

        if(Phaser.Rectangle.intersects(homeBase.getBounds(), player.getBounds())){
            homeRoof.alpha = homeRoof.alpha + (0-homeRoof.alpha)*.28;
        }else homeRoof.alpha = homeRoof.alpha + (1-homeRoof.alpha)*.18;

        if(!Phaser.Rectangle.intersects(lastRegion, player)){
            console.log("Regenerate");
            lastRegion.centerOn(player.body.position.x, player.body.position.y);
            regenerateTrees();
            if(gameStage == 2 && regeneratedTimes > 1 && pickedItems.reduce(function(a,b){return a+b}) > 0 && !regenerativeArea.contains(homePoint.x, homePoint.y)){
                lostHome();
            }

            if(gameStage == 5){
                if(!protectedArea.centerOn(player.x, player.y).contains(cat.x, cat.y)){
                    findCat();
                    //findHome();
                } 
            }
        }

        if(Phaser.Math.distanceSq(player.x,player.y,reciept.x,reciept.y+10) < 100){
            reciept.frame = 1;
            if(spaceKey.isDown && !recieptPicked){
                //game stage => 2
                gameStage += 1;
                reciept.destroy();
                recieptPicked = true;
                recieptLarge.visible = true;
                recieptPoint = new Phaser.Point(player.x, player.y);
            }
        }else reciept.frame = 0;
        if(recieptPicked && recieptShow){
            var dist = Phaser.Math.distanceSq(player.x,player.y,recieptPoint.x,recieptPoint.y);
            recieptLarge.alpha = Phaser.Math.max(0, (400-dist)/400);
            if(recieptLarge.alpha <= 0){
                recieptLarge.destroy();
                recieptShow = false;
                hud.visible = true;
            }
        }

        //Check for foods picking
        items.forEach(function(item){
            if(item.frame%3 != 2){
                var itemPickRect = item.getBounds();
                var itemHoverRect = itemPickRect.clone().scale(3,3).centerOn(itemPickRect.centerX, itemPickRect.centerY);
                var food_id = Math.floor(item.frame/3);
                if(Phaser.Rectangle.intersects(player.getBounds(),itemPickRect)){
                    item.frame = food_id*3+2;
                    pickedItems[food_id]++;
                    for(var i = 0; i < hud_text.length; i++) hud_text[i].text = pickedItems[i];
                    picking = true;
                    pickingTime = game.time.totalElapsedSeconds();
                    player.body.velocity.x = player.body.velocity.y = 0;
                    player.animations.stop();
                    player.animations.play(['left_pick','up_pick','right_pick','down_pick'][lastDirection]);
                
                    if (!bubble.visible && Math.floor(Math.random()*2)===1) {bubble_follow=player; bubble.visible=true;bubble.animations.play('happy');}
                
                    //If picked enough => gg mode --- gameStage => 3
                    if(gameStage == 3)
                    if(pickedItems.reduce(function(a,b){return a+b;}) > 1) gameStage+=1;

                }else if(Phaser.Rectangle.intersects(player.getBounds(),itemHoverRect)){
                    item.frame = food_id*3+1;
                }else{item.frame = food_id*3;}
            }
        });
        if(gameStage == 4){
            findHome();
            //TODO ADD FADE OUT AND DELAY
            gameStage = 5;
        }

        //check for cat
        if(gameStage == 5 && !catMoving){
            var catDistSq = Phaser.Math.distanceSq(player.x,player.y,cat.x,cat.y);
            if(catDistSq < 20*20){
                catLastMove = game.time.totalElapsedSeconds();
                catMoving = true;
                
                //catAnim.stop();
                var catDist = Phaser.Math.distance(homePoint.x-7, homePoint.y+14, cat.x, cat.y);
                var dx = (homePoint.x -7 - cat.x);
                var dy = (homePoint.y +14 - cat.y);
                if(catDist > 110){
                    dx = dx/catDist * 110;
                    dy = dy/catDist * 110;
                    if(Math.abs(dx) > Math.abs(dy)) dy *= 0.1;
                    else dx *= 0.1;
                }

                cat.body.velocity.x = dx;
                cat.body.velocity.y = dy;
                //var toX = cat.x + dx; var toY = cat.y + dy;
                //catAnim.stop().to( { x: toX, y: toY }, 3000, Phaser.Easing.Linear.None, false).from({x:cat.x, y:cat.y}).start();
            }else{
                cat.play("idle");
            }
        }else if(catMoving){
            var catDirection = 0;
            if(Math.abs(cat.body.velocity.x) > Math.abs(cat.body.velocity.y)){
                if(cat.body.velocity.x < 0) catDirection = 0;
                else catDirection = 2;
            }else{
                if(cat.body.velocity.y < 0) catDirection = 1;
                else catDirection = 3;
            }
            cat.animations.play(["left","up","right","down"][catDirection]);
            if(game.time.totalElapsedSeconds() - catLastMove > catMoveDuration){
                catMoving = false;
                cat.body.velocity.x = cat.body.velocity.y = 0;
            }
        }

        if(gameStage == 5){
            if(Phaser.Math.distanceSq(player.x,player.y,homePoint.x-7,homePoint.y+14) < 400){
                gameStage = 6;
                player.body.velocity.x = player.body.velocity.y = 0;
            }
        }
        
        
        
        if (gameStage<2 && Math.floor(Math.random()*2)===1)
            {
            if (!bubble.visible) {bubble_follow=cat; bubble.visible=true;bubble.animations.play('zzz');}
            } 
        
        if (gameStage==0)
            {
            if (!bubble.visible) {bubble_follow=player; bubble.visible=true;bubble.animations.play('zzz');}
            }

        
        
        if (bubble_follow!=null)
            {
            bubble.y = bubble_follow.y-bubble_follow.height-bubble.height;
            bubble.x = bubble_follow.x;
            }
    }

    var isLost = false;
    function lostHome(){
        isLost = true;
        homeGroup.forEach(function(val){val.visible = false;});
        homePoint.set(0,0);
        homeArea.centerOn(homePoint.x, homePoint.y);
        foodRestrictArea.centerOn(homePoint.x, homePoint.y);
        cat.visible = false;
        cat.position.x = cat.position.y = 0;
        gameStage = 3;
    }

    function findHome(){
        var angle = game.rnd.frac()*Phaser.Math.PI2;
        homePoint.set(player.x + Math.cos(angle)*500, player.y + Math.sin(angle)*500);
        homeArea.centerOn(homePoint.x, homePoint.y);
        homeBase.position.set(homePoint.x, homePoint.y);
        homeRoof.position.set(homePoint.x, homePoint.y + (128-98));
        homeGroup.forEach(function(val){
            val.visible = true; 
        });
    }

    function findCat(){
        screenArea.centerOn(player.x,player.y);
        cat.visible = true;
        cat.play('idle');
        if(Math.abs(regenDx) > Math.abs(regenDy)){
            if(regenDx > 0){ cat.position.x = screenArea.right + 20; cat.position.y = screenArea.centerY; }
            else{ cat.position.x = screenArea.left - 20; cat.position.y = screenArea.centerY; }
        }else{
            if(regenDy > 0){ cat.position.x = screenArea.centerX; cat.position.y = screenArea.bottom + 20;}
            else{ cat.position.x = screenArea.centerX; cat.position.y = screenArea.top - 20;}
        }
    }

    var regenOldX = 0,
        regenDx = 0,
        regenOldY = 0,
        regenDy = 0;
    var regeneratedTimes = 0;
    function regenerateTrees(){
        regenDx = player.x - regenOldX;
        regenDy = player.y - regenOldY;
        regenOldX = player.x;
        regenOldY = player.y;

        regeneratedTimes++;
        protectedArea.centerOn(player.x, player.y);
        regenerativeArea.centerOn(player.x, player.y);

        //Remove all trees and foods outside of the protected region
        var removeCond = function(val){
            return !protectedArea.contains(val.x, val.y)
                    || homeArea.contains(val.x, val.y); 
        }

        //Remove trees
        var newTrees = new Array();
        trees.forEach(function(val){
            if(removeCond(val)){
                val.destroy();
            }else newTrees.push(val);
        });
        trees = newTrees;
        //Remove foods
        var newItems = new Array();
        items.forEach(function(val){
            if(removeCond(val)){
                val.destroy();
            }else newItems.push(val);
        });
        items = newItems;
        

        //generate 50 trees with 1000 attempts
        var generated = 0;
        var point = new Phaser.Point();
        var treeType = game.rnd.integerInRange(0,2);

        for(var i = 0; i < 1000 && generated < 200; i++){
            regenerativeArea.random(point);
            if(protectedArea.contains(point.x, point.y) 
                || homeArea.contains(point.x, point.y)) continue;
           
            /*if(trees.getAll(this).some(function(tree){ return Phaser.Math.distanceSq(tree.x,tree.y,point.x,point.y) < 30*30; })){
                //console.log("2 near");
                continue;
            }*/

            //point.multiply(1/32,1/32);
            point.floor();
            //point.multiply(32,32);
            var tree = sortableGroup.create(point.x, point.y, 'tree');
            tree.frame = game.rnd.integerInRange(0,3) + treeType*4;
            tree.anchor.set(0.5,1);
            trees.push(tree);


            generated++;
        }

        //generate 10 foods with 1000 attempts
        var generated = 0;
        var point = new Phaser.Point();
        for(var i = 0; i < 10 && generated < 1000; i++){
            regenerativeArea.random(point);
            if(protectedArea.contains(point.x, point.y) 
                || foodRestrictArea.contains(point.x, point.y)) continue;
            /*if(trees.getAll(this).some(function(tree){ return Phaser.Math.distanceSq(tree.x,tree.y,point.x,point.y) < 30*30; })){
                //console.log("2 near");
                continue;
            }
            if(items.getAll(this).some(function(item){ return Phaser.Math.distanceSq(item.x,item.y,point.x,point.y) < 30*30; })){
                //console.log("2 near");
                continue;
            }*/

            //point.multiply(1/16,1/16);
            point.floor();
            //point.multiply(16,16);
            
            var item = sortableGroup.create(point.x, point.y, 'pickup');
            item.frame = game.rnd.integerInRange(0,3)*3;
            item.anchor.set(0.5,1);
            items.push(item);
            generated++;
        }
    }


    function render () {
        /*
        game.debug.geom(lastRegion,'#0fffff',false);
        game.debug.geom(debugScreenArea,'#0fffff',false);
        game.debug.geom(debugProtectedArea,'#0fffff',false);
        game.debug.geom(debugRegenerativeArea,'#0fffff',false);
        game.debug.text("Foods: " + items.length, 10, 10);
        game.debug.text("Trees: " + trees.length, 10, 30);
        game.debug.text("Waking up: " + wakingUp, 10, 50);
        game.debug.text("Waking dir: " + wakingDirLeft, 10, 70);
        */

       game.debug.text("Game Stage: " + gameStage, 10, 10);
    }

}(Phaser));