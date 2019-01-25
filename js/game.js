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
                update: update   // The update (game-loop) function
            }
    ); 

    function preload() {
		
		
        game.scale.scaleMode = Phaser.ScaleManager.USER_SCALE;
	game.scale.setGameSize(WIDTH,HEIGHT);
        game.scale.setUserScale(SCALE, SCALE);
        game.renderer.renderSession.roundPixels = true;
        Phaser.Canvas.setImageRenderingCrisp(game.canvas);
		
		
	game.load.image('back', 'assets/back.png');
        game.load.image('coin', 'assets/coin.png');
    }

    function create() {
        game.add.sprite(0, 0, 'back');
        game.add.sprite(0, 0, 'coin');


    }

    function update() {


    }

}(Phaser));