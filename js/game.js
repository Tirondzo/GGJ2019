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
        game.load.spritesheet('tree', 'assets/trees.png',16,32);
        game.load.spritesheet('pickup', 'assets/pickup.png',16,16);
        game.load.image('roof', 'assets/roof.png');
        game.load.image('room', 'assets/room.png');
        game.load.spritesheet('pickup_hud', 'assets/pickup_hud.png',16,16);
        game.load.spritesheet('player', 'assets/player.png',16,24);

        game.load.spritesheet('arrows', 'assets/arrow.png', 240, 50);
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
    }

    var ground;
    var player;
    var homeRoof, homeBase;

    var screenArea,
        protectedArea,
        regenerativeArea,
        lastRegion;

    var homeArea;
    var homePoint;

    var debugScreenArea,
        debugProtectedArea,
        debugRegenerativeArea;

    var trees = new Array()
        items = new Array();

    var screenFill;

    var sleeping;
    var wakingUp;
    var wakingDirLeft;

    var arrows;

    var sortableGroup;

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

        homeBase = sortableGroup.create(game.world.centerX, game.world.centerY, 'room');
        homeBase.anchor.set(0.5);

        homeRoof = sortableGroup.create(game.world.centerX, game.world.centerY, 'roof');
        homeRoof.anchor.set(0.5);
        homeRoof.alpha = 0;

        player = sortableGroup.create(game.world.centerX - 45, game.world.centerY + 10, 'player');

        //Over screen
        screenFill = game.add.sprite(0,0,debugTextures['scFill']);
        screenFill.fixedToCamera = true;
        arrows = game.add.sprite(game.centerX, game.height-50, 'arrows');
        arrows.fixedToCamera = true;

        playerFrameSpeed = 8;

        player.animations.add('right_idle',[0]);
        player.animations.add('right',[1,1,2,3,4,4,3,2],playerFrameSpeed,true);
        player.animations.add('right_pick',[0,5,0]);
        player.animations.add('up_idle',[6]);
        player.animations.add('up',[7,7,8,9,10,10,9,8],playerFrameSpeed,true);
        player.animations.add('up_pick',[6,11,6]);
        player.animations.add('left_idle',[12]);
        player.animations.add('left',[13,13,14,15,16,16,15,14],playerFrameSpeed,true);
        player.animations.add('left_pick',[12,17,12]);
        player.animations.add('down_idle',[18]);
        player.animations.add('down',[19,19,20,21,22,22,21,20],playerFrameSpeed,true);
        player.animations.add('down_pick',[18,23,18]);
        player.animations.add('sleep',[18,25],5,true);
        
        
        game.physics.enable(player, Phaser.Physics.ARCADE);
        game.camera.follow(player);


        screenArea = new Phaser.Rectangle(0,0,game.width,game.height);
        protectedArea = screenArea.clone().scale(2);
        regenerativeArea = protectedArea.clone().scale(2);
        lastRegion = screenArea.clone().scale(.5);

        lastRegion.centerOn(player.body.position.x, player.body.position.y);

        homePoint = new Phaser.Point(game.world.centerX, game.world.centerY);
        homeArea = new Phaser.Rectangle(0,0,300,300).centerOn(homePoint);

        debugScreenArea = screenArea.clone().centerOn(game.world.centerX, game.world.centerY);
        debugProtectedArea = protectedArea.clone().centerOn(game.world.centerX, game.world.centerY);
        debugRegenerativeArea = regenerativeArea.clone().centerOn(game.world.centerX, game.world.centerY);
    
        player.animations.play('sleep');
    }

    var lastDirection = 0;
    var pressedL = false;
    var pressedR = false;
    function update() {
        //MOVEMENT
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
            if(wakingUp > 100){
                sleeping = false;
                screenFill.alpha = 0;
                arrows.alpha = 0;
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
        }
    }

    var regeneratedTimes = 0;
    function regenerateTrees(){
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
        trees.forEach(function(val){
            if(removeCond(val)){
                val.destroy();
            }else newItems.push(val);
        });
        items = newItems;
        

        //generate 50 trees with 1000 attempts
        var generated = 0;
        var point = new Phaser.Point();
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
            tree.frame = game.rnd.integerInRange(0,3);
            trees.push(tree);

            generated++;
        }

        //generate 10 foods with 1000 attempts
        var generated = 0;
        var point = new Phaser.Point();
        for(var i = 0; i < 10 && generated < 1000; i++){
            regenerativeArea.random(point);
            if(protectedArea.contains(point.x, point.y) 
                || homeArea.contains(point.x, point.y)) continue;
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
            items.push(item);
            generated++;
        }
    }


    function render () {

        game.debug.geom(lastRegion,'#0fffff',false);
        game.debug.geom(debugScreenArea,'#0fffff',false);
        game.debug.geom(debugProtectedArea,'#0fffff',false);
        game.debug.geom(debugRegenerativeArea,'#0fffff',false);
        game.debug.text("Foods: " + items.length, 10, 10);
        game.debug.text("Trees: " + trees.length, 10, 30);
        game.debug.text("Waking up: " + wakingUp, 10, 50);
        game.debug.text("Waking dir: " + wakingDirLeft, 10, 70);
    }

}(Phaser));