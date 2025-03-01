// App.js
import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableWithoutFeedback,
  Animated,
  Dimensions,
  Alert,
} from 'react-native';

const { width, height } = Dimensions.get('window');

// Game constants
const BOX_SIZE = 50;
const BOX_POSITION_X = width / 3;
const PIPE_WIDTH = 80;
const GAP_HEIGHT = 200; // Space between top and bottom pipes
const GAME_SPEED = 2; // pixels per frame - slower for easier gameplay

const App = () => {
  // Game state
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);

  // Refs for game objects
  const boxY = useRef(new Animated.Value(height / 2)).current;
  const velocity = useRef(0);
  const boxPosition = useRef({ y: height / 2 });
  const [pipes, setPipes] = useState([]);
  const gameLoopRef = useRef(null);
  const animationRef = useRef(null);
  const gravity = 0.15; // Gentle gravity for floaty feel
  const jumpForce = -5; // Gentle jump force

  // Debug mode
  const [debug, setDebug] = useState(false);

  // Track box Y position for collision detection
  useEffect(() => {
    const listener = boxY.addListener(({ value }) => {
      boxPosition.current.y = value;
    });

    return () => boxY.removeListener(listener);
  }, []);

  // Setup game when play status changes
  useEffect(() => {
    if (isPlaying && !gameOver) {
      startGame();
    } else {
      // Clean up game
      clearInterval(gameLoopRef.current);
      cancelAnimationFrame(animationRef.current);
    }

    return () => {
      clearInterval(gameLoopRef.current);
      cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, gameOver]);

  // Start the game
  const startGame = () => {
    console.log("startGame function is being executed!"); // Debug log

    // Initialize pipes
    let pipeTimer = 0;

    // Game physics loop
    const updatePhysics = () => {
      // Update velocity and position with gravity
      velocity.current += gravity;
      boxY.setValue(boxPosition.current.y + velocity.current);

      // Add log at the beginning of checkCollisionsAndScore to see pipes state
      console.log("pipes: ", pipes); // <---- ADDED LOG: Check pipes state here
      checkCollisionsAndScore();

      // Check for collisions and boundaries (screen boundaries - top/bottom)
      if (boxPosition.current.y > height - BOX_SIZE || boxPosition.current.y < 0) {
        handleGameOver();
        return;
      }
      // Continue the animation loop if game is still active
      if (!gameOver) {
        animationRef.current = requestAnimationFrame(updatePhysics);
      }
    };

    // Start physics loop
    animationRef.current = requestAnimationFrame(updatePhysics);

    // Main game loop for obstacles and scoring (using setInterval)
    gameLoopRef.current = setInterval(() => {
      // Spawn new pipes every ~2.5 seconds
      pipeTimer += 16;
      if (pipeTimer > 2500) {
        pipeTimer = 0;

        // Random position for gap
        const gapStart = Math.random() * (height - GAP_HEIGHT - 200) + 100;

        // Add new pipe pair - TOP and BOTTOM pipes are created here!
        setPipes(current => {
          const updatedPipes = [ // Create updatedPipes inside setPipes callback
            ...current,
            { // Top pipe
              id: Date.now().toString() + '-top', // Unique ID for top pipe
              x: width,
              gapStart: gapStart,
              isTop: true, // Flag to identify top pipe (optional, for clarity)
              scored: false,
            },
            { // Bottom pipe
              id: Date.now().toString() + '-bottom', // Unique ID for bottom pipe
              x: width,
              gapStart: gapStart,
              isTop: false, // Flag for bottom pipe (optional)
              scored: false,
            },
          ];
          console.log("setPipes (CREATE PIPES) - pipes state AFTER setPipes:", updatedPipes); // <---- ADDED LOG: Log pipes after creation
          return updatedPipes; // Return the updated state
        });
      }

      // **Move pipes** - This part was already logically correct!
      setPipes(current => {
        const updatedPipes = current.map(pipe => ({ // Create updatedPipes inside setPipes callback
          ...pipe,
          x: pipe.x - GAME_SPEED, // Move left each frame
        }));
        const filteredPipes = updatedPipes.filter(pipe => pipe.x > -PIPE_WIDTH); // Filter pipes offscreen
        console.log("setPipes (MOVE PIPES) - pipes state AFTER setPipes:", filteredPipes); // <---- ADDED LOG: Log pipes after movement and filtering
        return filteredPipes; // Return the updated and filtered state
      });

    }, 16); // ~60fps (approximately 60 frames per second)
  };

  // Check for collisions with pipes and handle scoring
  const checkCollisionsAndScore = () => {
    // Box hitbox
    const boxLeft = BOX_POSITION_X - BOX_SIZE / 2;
    const boxRight = boxLeft + BOX_SIZE;
    const boxTop = boxPosition.current.y;
    const boxBottom = boxTop + BOX_SIZE;

    let collisionDetected = false;
    let scoreChanged = false;
    let newPipes = [...pipes];


    console.log("newPipes:", newPipes);

    for (let i = 0; i < newPipes.length; i++) {
      console.log("i:", i);
      const pipe = newPipes[i];

      // Pipe boundaries
      const pipeLeft = pipe.x;
      const pipeRight = pipe.x + PIPE_WIDTH;
      const topPipeBottom = pipe.gapStart;
      const bottomPipeTop = pipe.gapStart + GAP_HEIGHT;

      console.log("--- Pipe ID:", pipe.id, "---");
      console.log("Box (L, R, T, B):", boxLeft, boxRight, boxTop, boxBottom);
      console.log("Pipe (L, R, TopBottom, BottomTop):", pipeLeft, pipeRight, topPipeBottom, bottomPipeTop);
      console.log("Collision Detected! (Top or Bottom Pipe)");
      console.log("Scored! Pipe passed");
      console.log("No Collision with this pipe");
      console.log("Not scored yet, or still colliding");
      console.log("Game Over triggered from collision");
      console.log("Score increased to:", score + 1);

      // **Simplified Collision Detection**
      const pipeTopTop = 0; // Top of the top pipe is always 0
      const pipeBottomBottom = height; // Bottom of the bottom pipe is always screen height

      // Check for collision with the top pipe
      const topPipeCollision = (
        boxRight > pipeLeft &&
        boxLeft < pipeRight &&
        boxBottom > pipeTopTop &&
        boxTop < topPipeBottom
      );

      // Check for collision with the bottom pipe
      const bottomPipeCollision = (
        boxRight > pipeLeft &&
        boxLeft < pipeRight &&
        boxBottom > bottomPipeTop &&
        boxTop < pipeBottomBottom
      );

      if (topPipeCollision || bottomPipeCollision) {
        console.log("Collision Detected! (Top or Bottom Pipe)");
        collisionDetected = true;
        break; // Game over on first collision
      } else {
        console.log("No Collision with this pipe");
      }


      // Scoring - when box has passed the pipe (and not collided)
      if (!pipe.scored && boxRight < pipeLeft) {
        console.log("Scored! Pipe passed");
        newPipes[i] = { ...pipe, scored: true };
        scoreChanged = true;
      } else if (!pipe.scored) {
        console.log("Not scored yet, or still colliding");
      } else {
        console.log("Already scored");
      }
    }

    // Update game state based on checks
    if (collisionDetected) {
      console.log("Game Over triggered from collision");
      handleGameOver();
    } else {
      // Update pipes and score if changed
      if (scoreChanged) {
        setPipes(newPipes);
        setScore(score + 1);
        console.log("Score increased to:", score + 1);
      }
    }
  };

  // Handle game over (add log here too)
  const handleGameOver = () => {
    console.log("handleGameOver function called!");
    setGameOver(true);
    clearInterval(gameLoopRef.current);
    cancelAnimationFrame(animationRef.current);
  };
  // Jump function - flappy style
  const jump = () => {
    velocity.current = jumpForce;
  };

  // Reset game
  const resetGame = () => {
    console.log("resetGame function called!");
    setGameOver(false);
    setIsPlaying(false);
    setScore(0);
    setPipes([]);
    boxY.setValue(height / 2);
    velocity.current = 0;
    boxPosition.current.y = height / 2;

    // Start after short delay
    setTimeout(() => {
      setIsPlaying(true);
    }, 500);
  };

  // Handle screen tap
  const handleTap = () => {
    if (gameOver) {
      resetGame();
      return;
    }

    if (!isPlaying) {
      setIsPlaying(true);
      return;
    }

    jump();
  };

  // Long press handler for debug mode
  const handleLongPress = () => {
    if (!isPlaying) {
      setDebug(!debug);
      Alert.alert("Debug mode " + (!debug ? "enabled" : "disabled"));
    }
  };

  return (
    <TouchableWithoutFeedback
      onPress={handleTap}
      onLongPress={handleLongPress}
    >
      <View style={styles.container}>
        {/* Game world */}
        <View style={styles.gameWorld}>
          {/* Player character */}
          <Animated.View
            style={[
              styles.player,
              {
                transform: [{ translateY: boxY }],
                left: BOX_POSITION_X - BOX_SIZE / 2,
              },
            ]}
          />

          {/* Pipes */}
          {pipes.map(pipe => (
            <React.Fragment key={pipe.id}>
              {/* Top pipe */}
              <View
                style={[
                  styles.pipe,
                  {
                    left: pipe.x,
                    height: pipe.gapStart,
                    top: 0,
                  },
                  pipe.scored && debug ? styles.scoredPipe : null,
                ]}
              />
              {/* Bottom pipe */}
              <View
                style={[
                  styles.pipe,
                  {
                    left: pipe.x,
                    height: height - pipe.gapStart - GAP_HEIGHT,
                    bottom: 0,
                  },
                  pipe.scored && debug ? styles.scoredPipe : null,
                ]}
              />

              {/* Center of pipe marker (debug) */}
              {debug && (
                <View
                  style={[
                    styles.debugMarker,
                    {
                      left: pipe.x + PIPE_WIDTH / 2,
                      top: pipe.gapStart + GAP_HEIGHT / 2,
                    }
                  ]}
                />
              )}
            </React.Fragment>
          ))}

          {/* Debug hitbox */}
          {debug && isPlaying && (
            <Animated.View
              style={[
                styles.debugHitbox,
                {
                  transform: [{ translateY: boxY }],
                  left: BOX_POSITION_X - BOX_SIZE / 2,
                },
              ]}
            />
          )}
        </View>

        {/* UI Layer */}
        <Text style={styles.scoreText}>{score}</Text>

        {/* Game over overlay */}
        {gameOver && (
          <View style={styles.overlay}>
            <Text style={styles.gameOverText}>Game Over!</Text>
            <Text style={styles.finalScoreText}>Score: {score}</Text>
            <Text style={styles.instructionText}>Tap to restart</Text>
          </View>
        )}

        {/* Start screen */}
        {!isPlaying && !gameOver && (
          <View style={styles.overlay}>
            <Text style={styles.titleText}>Flappy Box</Text>
            <Text style={styles.instructionText}>Tap to start</Text>
            <Text style={styles.instructionText}>Keep tapping to fly</Text>
            <Text style={styles.smallText}>Long press for debug mode</Text>
          </View>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#87CEEB', // Sky blue background
  },
  gameWorld: {
    flex: 1,
  },
  player: {
    position: 'absolute',
    width: BOX_SIZE,
    height: BOX_SIZE,
    backgroundColor: '#FF4081', // Pink player
    borderRadius: 5,
    borderWidth: 2,
    borderColor: 'white',
  },
  pipe: {
    position: 'absolute',
    width: PIPE_WIDTH,
    backgroundColor: '#4CAF50', // Green pipes
    borderWidth: 3,
    borderColor: '#2E7D32', // Darker green border
  },
  scoredPipe: {
    backgroundColor: '#8BC34A', // Lighter green for scored pipes
    borderColor: '#FFC107', // Yellow border for scored pipes
  },
  scoreText: {
    position: 'absolute',
    top: 40,
    alignSelf: 'center',
    fontSize: 64,
    fontWeight: 'bold',
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: {width: 2, height: 2},
    textShadowRadius: 5
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  gameOverText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 20,
  },
  finalScoreText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 20,
  },
  titleText: {
    fontSize: 42,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 30,
  },
  instructionText: {
    fontSize: 24,
    color: 'white',
    marginVertical: 5,
  },
  smallText: {
    fontSize: 16,
    color: 'white',
    marginTop: 30,
    opacity: 0.7,
  },
  debugHitbox: {
    position: 'absolute',
    width: BOX_SIZE,
    height: BOX_SIZE,
    borderWidth: 2,
    borderColor: 'red',
    backgroundColor: 'rgba(255, 0, 0, 0.3)',
  },
  debugMarker: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'red',
  },
});

export default App;