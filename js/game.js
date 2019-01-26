(function (Phaser) {


    var SCALE = 2;
    var WIDTH = 480;
    var HEIGHT = 270;

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

        cursors = this.input.keyboard.createCursorKeys();
    }

    var player;
    var homeRoof, homeBase;

    var screenArea;
    var protectedArea;
    var regenerativeArea;
    var lastRegion;

    var trees;

    function create() {
        game.physics.startSystem(Phaser.Physics.ARCADE);
        game.world.setBounds(0, 0, 2000, 2000);
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


    function regenerateTrees(){
        protectedArea.centerOn(player.x, player.y);
        regenerativeArea.centerOn(player.x, player.y);

        //Remove all trees outside of the protected region
        var toDestroy = trees.filter(function(tree) { 
            return !protectedArea.contains(tree.position.x,
                                                tree.position.y); 
        });
        toDestroy.callAll('destroy');

        //generate 50 trees with 1000 attempts
        var generated = 0;
        var point = new Phaser.Point();
        for(var i = 0; i < 1000 && generated < 50; i++){
            regenerativeArea.random(point);
            if(protectedArea.contains(point.x, point.y)) continue;

            point.floor();
            trees.create(point.x, point.y, debugTextures['treeTrunk']);
            generated++;
        }
    }


    function render () {

        game.debug.geom(lastRegion,'#0fffff',false);
    
    }

}(Phaser));