// Home screen for the kiosk, made for the TV remote.
//
// The first collection is the home screen. A tile whose game has an
// `x-folder: <collection>` field is a folder: OK opens that collection in place
// of the home screen and Back closes it. Back on the home screen is left to
// Pegasus, which opens its main menu.

import QtQuick 2.15

FocusScope {
    id: root

    readonly property int columns: 5
    readonly property color accent: "#e8473b"
    readonly property var homeCollection: api.collections.count ? api.collections.get(0) : null
    property var folder: null  // the collection open as a folder; null on the home screen
    property int homeIndex: 0  // selection to go back to when the folder closes
    readonly property var shownCollection: folder || homeCollection
    readonly property var currentGame:
        shownCollection && grid.currentIndex >= 0 ? shownCollection.games.get(grid.currentIndex) : null

    function collectionNamed(name) {
        for (let i = 0; i < api.collections.count; i++) {
            if (api.collections.get(i).name === name)
                return api.collections.get(i);
        }
        return null;
    }

    function folderOf(game) {
        return game && game.extra.folder ? collectionNamed(String(game.extra.folder)) : null;
    }

    function activate() {
        const game = currentGame;
        if (!game)
            return;
        const collection = folderOf(game);
        if (collection) {
            homeIndex = grid.currentIndex;
            folder = collection;
            grid.currentIndex = 0;
            return;
        }
        // Pegasus reloads the theme after a launch; come back to the same tile
        api.memory.set("folder", folder ? folder.name : "");
        api.memory.set("homeIndex", homeIndex);
        api.memory.set("index", grid.currentIndex);
        game.launch();
    }

    function closeFolder() {
        folder = null;
        grid.currentIndex = homeIndex;
    }

    Component.onCompleted: {
        const folderName = api.memory.get("folder") || "";
        if (folderName) {
            homeIndex = api.memory.get("homeIndex") || 0;
            folder = collectionNamed(folderName);
        }
        grid.currentIndex = Math.max(0, Math.min(api.memory.get("index") || 0, grid.count - 1));
        grid.forceActiveFocus();
    }

    Rectangle {
        anchors.fill: parent
        gradient: Gradient {
            GradientStop { position: 0.0; color: "#1b1b20" }
            GradientStop { position: 1.0; color: "#0d0d0f" }
        }
    }

    // Header: where you are, and the time
    Item {
        id: header
        anchors { top: parent.top; left: parent.left; right: parent.right }
        anchors.leftMargin: vpx(56)
        anchors.rightMargin: vpx(56)
        height: vpx(96)

        Text {
            anchors { left: parent.left; verticalCenter: parent.verticalCenter }
            text: root.homeCollection
                ? root.homeCollection.name + (root.folder ? "  ›  " + root.folder.name : "")
                : "Nenhum item no menu"
            color: "white"
            font { family: global.fonts.sans; pixelSize: vpx(30); bold: true }
        }

        Column {
            id: clock
            property date now: new Date()
            anchors { right: parent.right; verticalCenter: parent.verticalCenter }

            Timer {
                interval: 1000; running: true; repeat: true
                onTriggered: clock.now = new Date()
            }
            Text {
                anchors.right: parent.right
                text: Qt.formatTime(clock.now, "HH:mm")
                color: "white"
                font { family: global.fonts.sans; pixelSize: vpx(30); bold: true }
            }
            Text {
                anchors.right: parent.right
                text: {
                    const day = clock.now.toLocaleDateString(Qt.locale("pt_BR"), "dddd, d 'de' MMMM");
                    return day.charAt(0).toUpperCase() + day.slice(1);
                }
                color: "#9a9aa2"
                font { family: global.fonts.sans; pixelSize: vpx(15) }
            }
        }
    }

    GridView {
        id: grid
        anchors { top: header.bottom; bottom: footer.top; left: parent.left; right: parent.right }
        anchors.leftMargin: vpx(40)
        anchors.rightMargin: vpx(40)
        clip: true
        focus: true
        model: root.shownCollection ? root.shownCollection.games : null
        cellWidth: width / root.columns
        cellHeight: cellWidth * 0.82 + vpx(44)

        Keys.onPressed: {
            if (event.isAutoRepeat)
                return;
            if (api.keys.isAccept(event)) {
                event.accepted = true;
                root.activate();
            } else if (api.keys.isCancel(event) && root.folder) {
                event.accepted = true;
                root.closeFolder();
            }
        }

        delegate: Item {
            id: cell
            readonly property bool selected: GridView.isCurrentItem
            readonly property var folderCollection: root.folderOf(modelData)
            width: grid.cellWidth
            height: grid.cellHeight

            Rectangle {
                id: card
                anchors { top: parent.top; horizontalCenter: parent.horizontalCenter }
                anchors.topMargin: vpx(14)
                width: grid.cellWidth * 0.82
                height: width
                radius: vpx(16)
                color: "#26262b"
                scale: cell.selected ? 1.08 : 1.0
                Behavior on scale { NumberAnimation { duration: 120 } }

                Image {
                    anchors { fill: parent; margins: vpx(12) }
                    visible: !cell.folderCollection || source != ""
                    source: modelData.assets.boxFront
                    fillMode: Image.PreserveAspectFit
                    asynchronous: true
                    smooth: true
                    mipmap: true
                }

                // A folder without its own picture shows its first four tiles
                Grid {
                    anchors { fill: parent; margins: vpx(14) }
                    visible: cell.folderCollection && modelData.assets.boxFront == ""
                    columns: 2
                    spacing: vpx(8)
                    Repeater {
                        model: cell.folderCollection ? Math.min(4, cell.folderCollection.games.count) : 0
                        Image {
                            width: (parent.width - parent.spacing) / 2
                            height: width
                            source: cell.folderCollection.games.get(index).assets.boxFront
                            fillMode: Image.PreserveAspectFit
                            asynchronous: true
                            smooth: true
                            mipmap: true
                        }
                    }
                }

                Rectangle {
                    anchors.fill: parent
                    anchors.margins: -vpx(5)
                    radius: parent.radius + vpx(5)
                    color: "transparent"
                    border { color: root.accent; width: vpx(5) }
                    visible: cell.selected
                }
            }

            Text {
                anchors { top: card.bottom; topMargin: vpx(14); left: parent.left; right: parent.right }
                horizontalAlignment: Text.AlignHCenter
                elide: Text.ElideRight
                text: modelData.title
                color: cell.selected ? "white" : "#a8a8b0"
                font { family: global.fonts.sans; pixelSize: vpx(18); bold: cell.selected }
            }

            MouseArea {
                anchors.fill: parent
                onClicked: {
                    grid.currentIndex = index;
                    root.activate();
                }
            }
        }
    }

    // Footer: what the selected tile does, and what the remote's buttons do
    Item {
        id: footer
        anchors { bottom: parent.bottom; left: parent.left; right: parent.right }
        anchors.leftMargin: vpx(56)
        anchors.rightMargin: vpx(56)
        height: vpx(104)

        Text {
            anchors { top: parent.top; left: parent.left; right: parent.right }
            text: root.currentGame ? root.currentGame.description : ""
            color: "#c4c4cc"
            wrapMode: Text.WordWrap
            maximumLineCount: 2
            elide: Text.ElideRight
            font { family: global.fonts.sans; pixelSize: vpx(17) }
        }

        Text {
            anchors { bottom: parent.bottom; bottomMargin: vpx(16); left: parent.left }
            textFormat: Text.StyledText
            text: "<b>OK</b> abrir   ·   <b>Voltar</b> " + (root.folder ? "sair da pasta" : "menu")
                + "      <font color='#3ccf5a'>●</font> início"
                + "   <font color='#e8473b'>●</font> fechar app"
                + "   <font color='#3b82e8'>●</font> teclado"
            color: "#8a8a92"
            font { family: global.fonts.sans; pixelSize: vpx(15) }
        }
    }
}
