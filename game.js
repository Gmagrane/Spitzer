// Spitzer Engine - Verified Interactive Turn-by-Turn Bidding Phase
let gameState = {
    gameNum: 1,
    matchNum: 1,
    targetPoints: 42,
    dealerIndex: 3,
    currentLeader: 0,
    biddingPlayerIndex: 0,
    players: [
        { name: 'You', isBot: false, hand: [], points: 0, gameWins: 0, matchWins: 0, team: '' },
        { name: 'Bot 2', isBot: true, hand: [], points: 0, gameWins: 0, matchWins: 0, team: '' },
        { name: 'Bot 3', isBot: true, hand: [], points: 0, gameWins: 0, matchWins: 0, team: '' },
        { name: 'Bot 4', isBot: true, hand: [], points: 0, gameWins: 0, matchWins: 0, team: '' }
    ],
    team1CardPoints: 0, 
    team2CardPoints: 0, 
    currentTrick: [],
    trickCount: 0,
    leadSuit: null,
    isLeadTrump: false,
    waitingForNextTrick: false,
    isSolo: false,
    soloType: null,
    soloPlayerIndex: -1,
    isBiddingActive: false,
    callerIndex: -1,
    blackQueensPlayedCount: 0,
    queenHolders: [],
    matchOver: false
};

function logMessage(msg) {
    const logDiv = document.getElementById("log");
    logDiv.innerHTML += `<div>> ${msg}</div>`;
    logDiv.scrollTop = logDiv.scrollHeight;
}

function createAndShuffleDeck() {
    const suits = ['spades', 'clubs', 'hearts', 'diamonds'];
    const ranks = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    let deck = [];

    suits.forEach(suit => {
        ranks.forEach(rank => {
            let val = 0;
            if (rank === 'A') val = 11;
            else if (rank === '10') val = 10;
            else if (rank === 'K') val = 4;
            else if (rank === 'Q') val = 3;
            else if (rank === 'J') val = 2;

            let name = `${rank} of ${suit}`;
            if (suit === 'clubs' && rank === 'Q') name = 'Big Queen (Queen of Clubs)';
            if (suit === 'diamonds' && rank === '7') name = 'The Spitzer (7 of Diamonds)';
            if (suit === 'spades' && rank === 'Q') name = 'Little Queen (Queen of Spades)';

            deck.push({ suit, rank, value: val, name, isTrump: isCardTrump(suit, rank) });
        });
    });

    for (let i = deck.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

function isCardTrump(suit, rank) {
    if (suit === 'clubs' && rank === 'Q') return true;
    if (suit === 'diamonds' && rank === '7') return true;
    if (suit === 'spades' && rank === 'Q') return true;
    if (suit === 'hearts' && rank === 'Q') return true;
    if (suit === 'diamonds' && rank === 'Q') return true;
    if (rank === 'J') return true;
    if (suit === 'diamonds') return true;
    return false;
}

function hasBothBlackQueens(player) {
    let hasBigQ = player.hand.some(c => c.suit === 'clubs' && c.rank === 'Q');
    let hasLittleQ = player.hand.some(c => c.suit === 'spades' && c.rank === 'Q');
    return hasBigQ && hasLittleQ;
}

function startNewHand() {
    if (gameState.matchOver) {
        logMessage("⚠️ Match is already completed! Click 'Reset Match' to start a new series.");
        return;
    }

    logMessage(`--- Dealing New Hand (Game ${gameState.gameNum} of 3) ---`);
    let deck = createAndShuffleDeck();

    gameState.players.forEach(p => {
        p.hand = deck.splice(0, 8);
        p.team = '';
    });

    gameState.team1CardPoints = 0;
    gameState.team2CardPoints = 0;
    gameState.currentTrick = [];
    gameState.trickCount = 0;
    gameState.leadSuit = null;
    gameState.isLeadTrump = false;
    gameState.waitingForNextTrick = false;
    gameState.isSolo = false;
    gameState.soloType = null;
    gameState.soloPlayerIndex = -1;
    gameState.isBiddingActive = true;
    gameState.callerIndex = -1;
    gameState.blackQueensPlayedCount = 0;
    gameState.queenHolders = [];

    gameState.dealerIndex = (gameState.dealerIndex + 1) % 4;
    gameState.currentLeader = (gameState.dealerIndex + 1) % 4;
    gameState.biddingPlayerIndex = gameState.currentLeader;

    updateUI();

    let dealerName = gameState.players[gameState.dealerIndex].name;
    logMessage(`Dealer: **${dealerName}**. Cards dealt. Calling phase begins.`);

    processBiddingTurn();
}

function processBiddingTurn() {
    let currentBidder = gameState.players[gameState.biddingPlayerIndex];

    if (currentBidder.isBot) {
        logMessage(`⏳ **${currentBidder.name}** is reviewing hand to call or pass...`);
        setTimeout(() => handleBotBiddingTurn(currentBidder), 1200);
    } else {
        logMessage(`👉 **Your Turn to Call:** Review your cards and click Call or No Call below.`);
        showBiddingControls(true);
    }
}

function showBiddingControls(show) {
    let panel = document.getElementById("control-panel");
    if (show) {
        let bidder = gameState.players[gameState.biddingPlayerIndex];
        let holdsQueens = hasBothBlackQueens(bidder);
        panel.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 8px; color: #f3c64f;">Calling Phase (${bidder.name}'s Turn):</div>
            <div style="font-size: 0.85em; margin-bottom: 5px; color: ${holdsQueens ? '#81c784' : '#e57373'};">
                ${holdsQueens ? '✓ Holds both Black Queens (Eligible to Call)' : '✗ Does not hold both Black Queens (Must No Call)'}
            </div>
            <button onclick="playerChooseCall()" ${!holdsQueens ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>Call</button>
            <button onclick="playerNoCall()">No Call</button>
        `;
    } else {
        panel.innerHTML = `
            <button onclick="startNewHand()">Start Next Hand</button>
            <button onclick="resetMatch()">Reset Match</button>
            <button onclick="declareSchneider()">Call Schneider</button>
        `;
    }
}

function playerChooseCall() {
    let player = gameState.players[0];
    if (!hasBothBlackQueens(player)) {
        logMessage(`⚠️ You must hold both Black Queens to call.`);
        return;
    }

    let panel = document.getElementById("control-panel");
    panel.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 8px; color: #f3c64f;">Select Your Call:</div>
        <button onclick="playerMakeCall('fail_ace')">Call Ace of a Fail Suit</button>
        <button onclick="playerMakeCall('trick_one_partner')">Declare: Winner of Trick 1 is Partner</button>
        <button onclick="playerChooseZoloMenu()">Declare Zolo</button>
        <button onclick="showBiddingControls(true)">Back</button>
    `;
}

function playerChooseZoloMenu() {
    let panel = document.getElementById("control-panel");
    panel.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 8px; color: #f3c64f;">Select Zolo Level:</div>
        <button onclick="declareZoloType('zolo')">Zolo (9 pts - Win majority)</button>
        <button onclick="declareZoloType('zolo_schneider')">Zolo-Schneider (27 pts)</button>
        <button onclick="declareZoloType('zolo_schwartz')">Zolo-Schneider-Schwartz (42 pts)</button>
        <button onclick="playerChooseCall()">Back</button>
    `;
}

function declareZoloType(type) {
    gameState.isSolo = true;
    gameState.soloType = type;
    gameState.soloPlayerIndex = 0;
    gameState.callerIndex = 0;

    let desc = "Zolo";
    if (type === 'zolo_schneider') desc = "Zolo-Schneider";
    if (type === 'zolo_schwartz') desc = "Zolo-Schneider-Schwartz";

    logMessage(`>>> **ZOLO DECLARED:** You announced **${desc}**! You are playing entirely solo.`);
    gameState.players.forEach((p, idx) => {
        p.team = (idx === 0) ? 'Solo Player' : 'Defense Team';
    });

    endBiddingPhase();
}

function playerMakeCall(callType) {
    if (!gameState.isBiddingActive) return;

    let player = gameState.players[0];
    if (!hasBothBlackQueens(player)) {
        logMessage(`⚠️ You must hold both Black Queens to make a call.`);
        return;
    }

    gameState.callerIndex = 0;

    if (callType === 'fail_ace') {
        let failSuits = ['spades', 'clubs', 'hearts'].filter(s => player.hand.some(c => !c.isTrump && c.suit === s));
        if (failSuits.length === 0) {
            logMessage(`⚠️ You do not hold fail suit cards for an Ace call! Choose Trick 1 Partner or Zolo.`);
            return;
        }
        let chosenSuit = failSuits[0];
        logMessage(`📢 **You declared:** Calling the **Ace of ${chosenSuit.charAt(0).toUpperCase() + chosenSuit.slice(1)}**!`);
        assignPartnerByCalledCard(chosenSuit, 'A', 0);
    } else if (callType === 'trick_one_partner') {
        logMessage(`📢 **You declared:** Partner is whoever wins the first trick!`);
        player.team = 'Caller (Pending Partner)';
        assignDefenseTeam(0);
    }

    endBiddingPhase();
}

function playerNoCall() {
    if (!gameState.isBiddingActive) return;
    logMessage(`You declared: **No Call**.`);
    advanceBiddingOrPass();
}

function handleBotBiddingTurn(bot) {
    if (!gameState.isBiddingActive) return;

    let botIndex = gameState.players.indexOf(bot);

    // Bots only attempt to call if they hold both Black Queens
    if (hasBothBlackQueens(bot) && Math.random() < 0.40) {
        gameState.callerIndex = botIndex;
        let failCards = bot.hand.filter(c => !c.isTrump);
        
        if (failCards.length > 0 && Math.random() < 0.6) {
            let targetSuit = failCards[0].suit;
            logMessage(`📢 **${bot.name} declared:** Calling the **Ace of ${targetSuit.charAt(0).toUpperCase() + targetSuit.slice(1)}**!`);
            assignPartnerByCalledCard(targetSuit, 'A', botIndex);
        } else {
            logMessage(`📢 **${bot.name} declared:** Partner is whoever wins the first trick!`);
            bot.team = 'Caller (Pending Partner)';
            assignDefenseTeam(botIndex);
        }
        endBiddingPhase();
    } else {
        logMessage(`💬 **${bot.name} declared: No Call.**`);
        advanceBiddingOrPass();
    }
}

function advanceBiddingOrPass() {
    gameState.biddingPlayerIndex = (gameState.biddingPlayerIndex + 1) % 4;

    // If we have cycled all the way back to the start and no caller was set
    if (gameState.biddingPlayerIndex === gameState.currentLeader && gameState.callerIndex === -1) {
        logMessage(`📢 All players passed (No Calls made)! Defaulting to **Secret Black Queen Partnerships**. Watch the table closely!`);
        assignSecretBlackQueenPartnerships();
        endBiddingPhase();
        return;
    }

    processBiddingTurn();
}

function endBiddingPhase() {
    gameState.isBiddingActive = false;
    showBiddingControls(false);
    updateUI();

    let leaderName = gameState.players[gameState.currentLeader].name;
    logMessage(`--- Calling Complete! Play Begins. ${leaderName} leads the first trick. ---`);

    if (gameState.currentLeader !== 0) {
        setTimeout(playBotTurn, 800);
    }
}

function assignSecretBlackQueenPartnerships() {
    if (gameState.isSolo) return;
    gameState.players.forEach(p => p.team = 'Secret Alliance');
}

function assignPartnerByCalledCard(suit, rank, callerIndex) {
    let caller = gameState.players[callerIndex];
    let partnerFound = false;

    gameState.players.forEach((p, idx) => {
        let hasCard = p.hand.some(c => c.suit === suit && c.rank === rank);
        if (hasCard && idx !== callerIndex) {
            p.team = 'Team Caller';
            partnerFound = true;
            logMessage(`🤝 **${p.name}** holds the ${rank} of ${suit} and is secret partner to ${caller.name}!`);
        } else if (idx === callerIndex) {
            p.team = 'Team Caller';
        } else {
            p.team = 'Team Defense';
        }
    });

    if (!partnerFound) {
        logMessage(`⚠️ ${caller.name} holds the ${rank} of ${suit} themselves! Playing alone.`);
        caller.team = 'Solo Caller';
    }
}

function assignDefenseTeam(callerIndex) {
    gameState.players.forEach((p, idx) => {
        if (idx !== callerIndex) {
            p.team = 'Team Defense';
        }
    });
}

function getSuitSymbol(suit) {
    switch(suit) {
        case 'spades': return '♠';
        case 'clubs': return '♣';
        case 'hearts': return '♥';
        case 'diamonds': return '♦';
    }
}

function getCardPower(card) {
    if (card.suit === 'clubs' && card.rank === 'Q') return 1;
    if (card.suit === 'diamonds' && card.rank === '7') return 2;
    if (card.suit === 'spades' && card.rank === 'Q') return 3;
    if (card.suit === 'hearts' && card.rank === 'Q') return 4;
    if (card.suit === 'diamonds' && card.rank === 'Q') return 5;
    if (card.suit === 'clubs' && card.rank === 'J') return 6;
    if (card.suit === 'spades' && card.rank === 'J') return 7;
    if (card.suit === 'hearts' && card.rank === 'J') return 8;
    if (card.suit === 'diamonds' && card.rank === 'J') return 9;
    if (card.suit === 'diamonds') return 10 + (14 - getRankValue(card.rank));
    return 100;
}

function getRankValue(rank) {
    if (rank === 'A') return 14;
    if (rank === '10') return 10;
    if (rank === 'K') return 4;
    if (rank === 'Q') return 3;
    if (rank === 'J') return 2;
    return parseInt(rank) || 0;
}

function getLegalPlays(hand, isLeadTrump, leadSuit) {
    if (gameState.currentTrick.length === 0) return hand;

    let legalCards = [];
    if (isLeadTrump) {
        let trumps = hand.filter(c => c.isTrump);
        legalCards = trumps.length > 0 ? trumps : hand;
    } else {
        let matchingFailCards = hand.filter(c => !c.isTrump && c.suit === leadSuit);
        if (matchingFailCards.length > 0) {
            legalCards = matchingFailCards;
        } else {
            let trumps = hand.filter(c => c.isTrump);
            if (trumps.length > 0) {
                legalCards = trumps;
            } else {
                legalCards = hand;
            }
        }
    }
    return legalCards;
}

function playerPlayCard(index) {
    if (gameState.isBiddingActive) {
        logMessage("⚠️ Please finish the calling phase (Call or No Call) before playing cards!");
        return;
    }
    if (gameState.waitingForNextTrick) return;
    if (gameState.currentLeader !== 0 && gameState.currentTrick.length === 0) {
        logMessage("It is not your turn to lead!");
        return;
    }
    if (gameState.currentTrick.length >= 4) return;

    let selectedCard = gameState.players[0].hand[index];
    let legalHand = getLegalPlays(gameState.players[0].hand, gameState.isLeadTrump, gameState.leadSuit);

    if (!legalHand.includes(selectedCard)) {
        logMessage(`⚠️ **Rule Violation Blocked:** You must follow suit, or play a trump if void!`);
        return;
    }

    let card = gameState.players[0].hand.splice(index, 1)[0];
    checkBlackQueenPlayed(card, 'You', 0);

    if (gameState.currentTrick.length === 0) {
        gameState.isLeadTrump = card.isTrump;
        gameState.leadSuit = card.isTrump ? 'trump' : card.suit;
    }

    gameState.currentTrick.push({ owner: 'You', playerIndex: 0, card: card });
    updateUI();
    logMessage(`You played: ${card.name}`);

    proceedNextPlayer();
}

function checkBlackQueenPlayed(card, playerName, playerIndex) {
    if (!gameState.isSolo && gameState.callerIndex === -1 && (card.name.includes('Big Queen') || card.name.includes('Little Queen'))) {
        if (!gameState.queenHolders.includes(playerIndex)) {
            gameState.queenHolders.push(playerIndex);
            gameState.blackQueensPlayedCount++;
            logMessage(`👑 **${playerName}** played the **${card.name}**! (${gameState.blackQueensPlayedCount}/2 Black Queens revealed).`);

            if (gameState.blackQueensPlayedCount === 2) {
                logMessage(`🔥 **Both Black Queens have been played!** Partnerships are revealed!`);
                gameState.players.forEach((p, idx) => {
                    if (gameState.queenHolders.includes(idx)) {
                        p.team = 'Team Queens';
                    } else {
                        p.team = 'Team Defense';
                    }
                });
                logMessage(`🤝 **Teams Aligned:** ${gameState.players[gameState.queenHolders[0]].name} & ${gameState.players[gameState.queenHolders[1]].name} form **Team Queens**!`);
                updateUI();
            }
        }
    }
}

function proceedNextPlayer() {
    if (gameState.currentTrick.length === 4) {
        setTimeout(evaluateTrickWinner, 900);
        return;
    }

    let nextPlayerIdx = (gameState.currentLeader + gameState.currentTrick.length) % 4;
    if (nextPlayerIdx !== 0) {
        setTimeout(playBotTurn, 700);
    }
}

function playBotTurn() {
    if (gameState.currentTrick.length >= 4) return;

    let botIdx = (gameState.currentLeader + gameState.currentTrick.length) % 4;
    let bot = gameState.players[botIdx];

    if (bot.hand.length === 0) return;

    let validCards = getLegalPlays(bot.hand, gameState.isLeadTrump, gameState.leadSuit);
    let chosenCard;

    if (gameState.currentTrick.length > 0) {
        let currentWinningItem = gameState.currentTrick[0];
        let currentWinningPower = getCardPower(currentWinningItem.card);
        
        gameState.currentTrick.forEach(item => {
            let p = getCardPower(item.card);
            if (gameState.isLeadTrump && item.card.isTrump && p < currentWinningPower) {
                currentWinningPower = p;
                currentWinningItem = item;
            } else if (!gameState.isLeadTrump) {
                if (item.card.isTrump && !currentWinningItem.card.isTrump) {
                    currentWinningPower = p;
                    currentWinningItem = item;
                } else if (item.card.isTrump && currentWinningItem.card.isTrump && p < currentWinningPower) {
                    currentWinningPower = p;
                    currentWinningItem = item;
                } else if (!item.card.isTrump && item.card.suit === gameState.leadSuit && !currentWinningItem.card.isTrump) {
                    if (getRankValue(item.card.rank) > getRankValue(currentWinningItem.card.rank)) {
                        currentWinningPower = p;
                        currentWinningItem = item;
                    }
                }
            }
        });

        let winningPlayer = gameState.players[currentWinningItem.playerIndex];
        let isPartnerWinning = (bot.team === winningPlayer.team);

        let trumps = validCards.filter(c => c.isTrump);
        let trickPoints = gameState.currentTrick.reduce((sum, item) => sum + item.card.value, 0);

        if (trumps.length > 0 && (!isPartnerWinning || trickPoints >= 10)) {
            trumps.sort((a, b) => getCardPower(a) - getCardPower(b));
            let bestTrumpPower = getCardPower(trumps[0]);
            if (gameState.isLeadTrump || bestTrumpPower < currentWinningPower) {
                chosenCard = trumps[0];
            }
        }

        if (!chosenCard) {
            if (isPartnerWinning) {
                let pointCards = validCards.filter(c => c.value >= 10);
                if (pointCards.length > 0) {
                    pointCards.sort((a, b) => b.value - a.value);
                    chosenCard = pointCards[0];
                } else {
                    validCards.sort((a, b) => b.value - a.value);
                    chosenCard = validCards[0];
                }
            } else {
                validCards.sort((a, b) => a.value - b.value);
                chosenCard = validCards[0];
            }
        }
    } else {
        let cardIdx = Math.floor(Math.random() * validCards.length);
        chosenCard = validCards[cardIdx];
    }

    let realIdx = bot.hand.indexOf(chosenCard);
    let card = bot.hand.splice(realIdx, 1)[0];

    checkBlackQueenPlayed(card, bot.name, botIdx);

    if (gameState.currentTrick.length === 0) {
        gameState.isLeadTrump = card.isTrump;
        gameState.leadSuit = card.isTrump ? 'trump' : card.suit;
    }

    gameState.currentTrick.push({ owner: bot.name, playerIndex: botIdx, card: card });
    updateUI();
    logMessage(`${bot.name} played: ${card.name}`);

    proceedNextPlayer();
}

function evaluateTrickWinner() {
    let totalTrickPoints = 0;
    gameState.currentTrick.forEach(item => totalTrickPoints += item.card.value);

    let trumpPlays = gameState.currentTrick.filter(item => item.card.isTrump);
    let winningItem;

    if (trumpPlays.length > 0) {
        winningItem = trumpPlays.reduce((best, curr) => {
            return getCardPower(curr.card) < getCardPower(best.card) ? curr : best;
        });
    } else {
        let suitPlays = gameState.currentTrick.filter(item => !item.card.isTrump && item.card.suit === gameState.leadSuit);
        winningItem = suitPlays.reduce((best, curr) => {
            return getRankValue(curr.card.rank) > getRankValue(best.card.rank) ? curr : best;
        });
    }

    let winningPlayer = gameState.players[winningItem.playerIndex];

    if (gameState.trickCount === 0) {
        let callerIndex = gameState.players.findIndex(p => p.team === 'Caller (Pending Partner)');
        if (callerIndex !== -1) {
            let caller = gameState.players[callerIndex];
            if (winningItem.playerIndex === callerIndex) {
                logMessage(`🤝 ${caller.name} won the first trick themselves! Playing alone.`);
                gameState.players.forEach((p, idx) => {
                    p.team = (idx === callerIndex) ? 'Solo Caller' : 'Defense Team';
                });
            } else {
                logMessage(`🤝 **${winningPlayer.name}** won the first trick and is now official partner to **${caller.name}**!`);
                gameState.players.forEach((p, idx) => {
                    if (idx === callerIndex || idx === winningItem.playerIndex) {
                        p.team = 'Callers';
                    } else {
                        p.team = 'Team Defense';
                    }
                });
            }
        }
    }

    let isTeam1Winner = false;
    if (gameState.isSolo) {
        isTeam1Winner = (winningItem.playerIndex === gameState.soloPlayerIndex);
    } else if (gameState.callerIndex !== -1) {
        isTeam1Winner = (winningItem.playerIndex === 0 || winningPlayer.team === 'Callers' || winningPlayer.team === 'Team Caller');
    } else {
        isTeam1Winner = (winningItem.playerIndex === 0 || (winningPlayer.team === 'Team Queens'));
    }

    if (isTeam1Winner || winningItem.playerIndex === 0) {
        gameState.team1CardPoints += totalTrickPoints;
    } else {
        gameState.team2CardPoints += totalTrickPoints;
    }

    logMessage(`🏁 **${winningItem.owner}** wins the trick (+${totalTrickPoints} pts).`);

    gameState.currentLeader = winningItem.playerIndex;
    gameState.trickCount++;
    gameState.leadSuit = null;
    gameState.isLeadTrump = false;
    gameState.waitingForNextTrick = true;

    updateUI();

    const table = document.getElementById("center-table");
    const nextBtn = document.createElement("button");
    nextBtn.innerText = gameState.trickCount >= 8 ? "Evaluate Hand Scoring" : "Clear Trick & Continue";
    nextBtn.style.flexBasis = "100%";
    nextBtn.style.padding = "8px 15px";
    nextBtn.onclick = () => {
        gameState.currentTrick = [];
        gameState.waitingForNextTrick = false;
        document.getElementById("center-table").innerHTML = "";
        if (gameState.trickCount >= 8) {
            evaluateHandEnd();
        } else {
            let leaderName = gameState.players[gameState.currentLeader].name;
            logMessage(`--- Next Trick (Led by ${leaderName}) ---`);
            updateUI();
            if (gameState.currentLeader !== 0) {
                setTimeout(playBotTurn, 600);
            }
        }
    };
    table.appendChild(nextBtn);
}

function updateUI() {
    document.getElementById("current-game").innerText = gameState.gameNum;
    document.getElementById("dealer-label").innerText = gameState.players[gameState.dealerIndex].name;
    document.getElementById("leader-label").innerText = gameState.players[gameState.currentLeader].name;

    document.getElementById("player-seat-label").innerText = `Your Hand - ${gameState.players[0].name} (${gameState.players[0].team || 'Secret'}) [Pts: ${gameState.players[0].points} | Wins: ${gameState.players[0].gameWins}]`;
    document.getElementById("seat-left-label").innerText = `${gameState.players[1].name} (${gameState.players[1].team || 'Secret'}) [Pts: ${gameState.players[1].points} | Wins: ${gameState.players[1].gameWins}]`;
    document.getElementById("seat-top-label").innerText = `${gameState.players[2].name} (${gameState.players[2].team || 'Secret'}) [Pts: ${gameState.players[2].points} | Wins: ${gameState.players[2].gameWins}]`;
    document.getElementById("seat-right-label").innerText = `${gameState.players[3].name} (${gameState.players[3].team || 'Secret'}) [Pts: ${gameState.players[3].points} | Wins: ${gameState.players[3].gameWins}]`;

    const handDiv = document.getElementById("player-hand");
    handDiv.innerHTML = "";
    gameState.players[0].hand.forEach((card, index) => {
        const cardEl = document.createElement("div");
        cardEl.className = `card ${card.suit === 'hearts' || card.suit === 'diamonds' ? 'red' : ''}`;
        cardEl.innerHTML = `<div>${card.rank}</div><div style="text-align:center; font-size: 1.4em;">${getSuitSymbol(card.suit)}</div><div style="text-align:right;">${card.rank}</div>`;
        cardEl.onclick = () => playerPlayCard(index);
        handDiv.appendChild(cardEl);
    });

    renderBotPreview(1, "bot2-hand-preview");
    renderBotPreview(2, "bot3-hand-preview");
    renderBotPreview(3, "bot4-hand-preview");

    const table = document.getElementById("center-table");
    if (!gameState.waitingForNextTrick) {
        table.innerHTML = "";
        gameState.currentTrick.forEach(item => {
            const cardWrapper = document.createElement("div");
            cardWrapper.style.textAlign = "center";
            
            const label = document.createElement("div");
            label.innerText = item.owner;
            label.style.fontSize = "0.75em";
            label.style.marginBottom = "2px";
            label.style.fontWeight = "bold";

            const cardEl = document.createElement("div");
            cardEl.className = `card ${item.card.suit === 'hearts' || item.card.suit === 'diamonds' ? 'red' : ''}`;
            cardEl.innerHTML = `<div>${item.card.rank}</div><div style="text-align:center; font-size: 1.4em;">${getSuitSymbol(item.card.suit)}</div><div style="text-align:right;">${item.card.rank}</div>`;
            
            cardWrapper.appendChild(label);
            cardWrapper.appendChild(cardEl);
            table.appendChild(cardWrapper);
        });
    }
}

function renderBotPreview(botIndex, elementId) {
    const previewDiv = document.getElementById(elementId);
    previewDiv.innerHTML = "";
    gameState.players[botIndex].hand.forEach(card => {
        const mini = document.createElement("div");
        mini.className = `mini-card ${card.suit === 'hearts' || card.suit === 'diamonds' ? 'red' : ''}`;
        mini.innerHTML = `<div>${card.rank}</div><div style="text-align:center;">${getSuitSymbol(card.suit)}</div>`;
        previewDiv.appendChild(mini);
    });
}

function evaluateHandEnd() {
    logMessage(`--- Hand Completed ---`);
    logMessage(`Final Card Points -> Solo/Callers: ${gameState.team1CardPoints} | Defense: ${gameState.team2CardPoints}`);

    let pointsToAdd = 3;

    if (gameState.isSolo) {
        let soloPlayer = gameState.players[gameState.soloPlayerIndex];
        let actualSoloPts = gameState.team1CardPoints; 

        if (gameState.soloType === 'zolo') {
            if (actualSoloPts >= 61) {
                pointsToAdd = 9;
                logMessage(`🏆 **Zolo Won!** (+9 Game Points awarded to ${soloPlayer.name}).`);
                soloPlayer.points += pointsToAdd;
            } else {
                pointsToAdd = 9;
                logMessage(`❌ **Zolo Defeated!** Defense successfully stopped the solo player (+${pointsToAdd} Game Points awarded to each defending player).`);
                gameState.players.forEach((p, idx) => {
                    if (idx !== gameState.soloPlayerIndex) {
                        p.points += pointsToAdd;
                    }
                });
            }
        } else if (gameState.soloType === 'zolo_schneider') {
            if (actualSoloPts >= 90 && gameState.team2CardPoints === 0) {
                pointsToAdd = 27;
                logMessage(`⚡ **Zolo-Schneider Won!** (+27 Game Points awarded).`);
                soloPlayer.points += pointsToAdd;
            } else {
                pointsToAdd = 27;
                logMessage(`❌ **Zolo-Schneider Failed!** (+${pointsToAdd} Game Points awarded to each defending player).`);
                gameState.players.forEach((p, idx) => {
                    if (idx !== gameState.soloPlayerIndex) {
                        p.points += pointsToAdd;
                    }
                });
            }
        } else if (gameState.soloType === 'zolo_schwartz') {
            if (actualSoloPts === 120) {
                pointsToAdd = 42;
                logMessage(`🔥 **Zolo-Schneider-Schwartz Won!** (+42 Game Points awarded).`);
                soloPlayer.points += pointsToAdd;
            } else {
                pointsToAdd = 42;
                logMessage(`❌ **Zolo-Schneider-Schwartz Failed!** (+${pointsToAdd} Game Points awarded to each defending player).`);
                gameState.players.forEach((p, idx) => {
                    if (idx !== gameState.soloPlayerIndex) {
                        p.points += pointsToAdd;
                    }
                });
            }
        }

    } else {
        if (gameState.team1CardPoints >= 90) {
            pointsToAdd = 6;
            logMessage(`⚡ **Standard Schneider!** (+6 Game Points awarded).`);
        } else {
            pointsToAdd = 3;
            logMessage(`👍 **Standard Win!** (+3 Game Points awarded).`);
        }

        gameState.players.forEach(p => {
            let isTeam1 = (p.team === 'Team Queens' || p.team === 'Team Caller' || p.team === 'Callers');
            if (isTeam1 && gameState.team1CardPoints >= 61) {
                p.points += pointsToAdd;
            } else if (!isTeam1 && gameState.team2CardPoints >= 60) {
                p.points += pointsToAdd;
            }
        });
    }

    updateUI();

    let gameWinner = gameState.players.find(p => p.points >= gameState.targetPoints);

    if (gameWinner) {
        gameWinner.gameWins++;
        logMessage(`🏆 **Game ${gameState.gameNum} Won by ${gameWinner.name}** (Reached ${gameWinner.points} points)!`);

        if (gameState.gameNum < 3) {
            gameState.gameNum++;
            logMessage(`>>> Moving to **Game ${gameState.gameNum} of 3**. Resetting hand point totals to 0.`);
            gameState.players.forEach(p => p.points = 0);
            updateUI();
        } else {
            gameState.matchOver = true;
            let matchWinner = gameState.players.reduce((max, p) => p.points > max.points ? p : max);
            logMessage(`🎉 **MATCH COMPLETED (All 3 Games Finished)!** Match Winner: **${matchWinner.name}** with the most total points!`);
            document.getElementById("control-panel").innerHTML = `<button onclick="resetMatch()">Start New Match</button>`;
        }
    } else {
        logMessage(`>>> Game ${gameState.gameNum} continues. Start next hand to keep building toward 42 points.`);
    }
}

function resetMatch() {
    gameState.gameNum = 1;
    gameState.matchNum++;
    gameState.matchOver = false;
    gameState.players.forEach(p => {
        p.points = 0;
        p.gameWins = 0;
        p.matchWins = 0;
        p.team = '';
    });
    logMessage(`🔄 **Match Reset!** Starting a fresh 3-game series.`);
    startNewHand();
}

function declareSchneider() {
    logMessage(">>> SCHNEIDER ANNOUNCED!");
}