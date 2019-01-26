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

    function procGenDebugTexture(w,h,name,fill=false){
        var bmd = game.make.bitmapData(w,h);
        var ctx = bmd.ctx;
        ctx.strokeStyle = "#ffd900";
        ctx.lineWidth = 5;
        ctx.strokeRect(0,0,w,h);

        ctx.fillStyle = "#FF3300";
        ctx.font = "10px Verdana";
        ctx.fillText(name,3,13);
        
        if(fill){
            ctx.fillStyle = "#FF3300";
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
		
		
	    game.load.image('back', 'assets/back.png');
        game.load.image('coin', 'assets/coin.png');

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

        cursors = this.input.keyboard.createCursorKeys();
    }

    var player;
    var homeRoof, homeBase;

    var screenArea,
        protectedArea,
        regenerativeArea,
        lastRegion;

    var debugScreenArea;
        debugProtectedArea,
        debugRegenerativeArea;

    var trees,
        items;

    function create() {
        game.physics.startSystem(Phaser.Physics.ARCADE);
        game.world.setBounds(0, 0, 1e9, 1e9);
        game.stage.backgroundColor = "#EEEEEE";
        //game.add.sprite(0, 0, 'back');
        game.add.sprite(10, 10, 'coin');

        homeRoof = game.add.sprite(game.world.centerX, game.world.centerY, debugTextures['homeRoof']);
        homeRoof.anchor.set(0.5);
        homeRoof.alpha = 0;

        homeBase = game.add.sprite(game.world.centerX, game.world.centerY, debugTextures['homeBase']);
        homeBase.anchor.set(0.5);

        player = game.add.sprite(game.world.centerX, game.world.centerY, debugTextures['player']);
        game.physics.enable(player, Phaser.Physics.ARCADE);
        game.camera.follow(player);


        screenArea = new Phaser.Rectangle(0,0,game.width,game.height);
        protectedArea = screenArea.clone().scale(2);
        regenerativeArea = protectedArea.clone().scale(2);
        lastRegion = screenArea.clone().scale(.5);

        lastRegion.centerOn(player.body.position.x, player.body.position.y);

        trees = game.add.group();
        items = game.add.group();


        debugScreenArea = screenArea.clone().centerOn(game.world.centerX, game.world.centerY);
        debugProtectedArea = protectedArea.clone().centerOn(game.world.centerX, game.world.centerY);
        debugRegenerativeArea = regenerativeArea.clone().centerOn(game.world.centerX, game.world.centerY);
    }

    function update() {
        if(cursors.left.isDown) player.body.velocity.x = -100;
        else if(cursors.right.isDown) player.body.velocity.x = +100;
        else player.body.velocity.x = 0;

        if(cursors.down.isDown) player.body.velocity.y = +100;
        else if(cursors.up.isDown) player.body.velocity.y = -100;
        else player.body.velocity.y = 0;

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

        //Remove all trees outside of the protected region
        var toDestroy = trees.filter(function(tree) { 
            return !protectedArea.contains(tree.position.x,
                                                tree.position.y); 
        });
        toDestroy.callAll('destroy');
        toDestroy = items.filter(function(item) { 
            return !protectedArea.contains(item.position.x,
                                                item.position.y); 
        });
        toDestroy.callAll('destroy');

        //generate 50 trees with 1000 attempts
        var generated = 0;
        var point = new Phaser.Point();
        for(var i = 0; i < 1000 && generated < 100; i++){
            regenerativeArea.random(point);
            if(protectedArea.contains(point.x, point.y)) continue;
            if(trees.getAll(this).some(function(tree){ return Phaser.Math.distanceSq(tree.x,tree.y,point.x,point.y) < 50*50; })){
                //console.log("2 near");
                continue;
            }

            //point.multiply(1/32,1/32);
            point.floor();
            //point.multiply(32,32);
            trees.create(point.x, point.y, debugTextures['treeTrunk']);
            generated++;
        }

        //generate 10 foods with 1000 attempts
        var generated = 0;
        var point = new Phaser.Point();
        for(var i = 0; i < 10 && generated < 1000; i++){
            regenerativeArea.random(point);
            if(protectedArea.contains(point.x, point.y)) continue;
            if(trees.getAll(this).some(function(tree){ return Phaser.Math.distanceSq(tree.x,tree.y,point.x,point.y) < 30*30; })){
                //console.log("2 near");
                continue;
            }
            if(items.getAll(this).some(function(item){ return Phaser.Math.distanceSq(item.x,item.y,point.x,point.y) < 30*30; })){
                //console.log("2 near");
                continue;
            }

            //point.multiply(1/16,1/16);
            point.floor();
            //point.multiply(16,16);
            
            items.create(point.x, point.y, debugTextures['food']);
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
    }

}(Phaser));