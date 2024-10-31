import React, { useContext, useEffect, useState } from "react";
import "./ChatBox.css";
import assets from "../../assets/assets";
import { AppContext } from "../../context/AppContext";
import { 
  arrayUnion, 
  doc, 
  getDoc, 
  onSnapshot, 
  updateDoc,
  Timestamp 
} from "firebase/firestore";
import { db } from "../../config/firebase";
import { toast } from "react-toastify";
import upload from "../../lib/upload";

const ChatBox = () => {
  const { 
    userData, 
    messagesId, 
    chatUser, 
    messages, 
    setMessages, 
    chatVisible, 
    setChatVisible, 
    showRight, 
    setShowRight 
  } = useContext(AppContext);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim() || !messagesId || isLoading) return;
    
    setIsLoading(true);
    try {
      const messageData = {
        sId: userData.id,
        text: input.trim(),
        createdAt: Timestamp.now() 
      };

      await updateDoc(doc(db, 'messages', messagesId), {
        messages: arrayUnion(messageData)
      });

      // Update chats for both users
      const userIDs = [chatUser.rId, userData.id];
      await Promise.all(userIDs.map(async (id) => {
        const userChatsRef = doc(db, 'chats', id);
        const userChatsSnapshot = await getDoc(userChatsRef);

        if (userChatsSnapshot.exists()) {
          const userChatData = userChatsSnapshot.data();
          const chatIndex = userChatData.chatsData.findIndex(
            (c) => c.messageId === messagesId
          );

          if (chatIndex !== -1) {
            const updatedChatsData = [...userChatData.chatsData];
            updatedChatsData[chatIndex] = {
              ...updatedChatsData[chatIndex],
              lastMessage: input.slice(0, 30),
              updatedAt: Date.now(),
              messageSeen: id === userData.id
            };

            await updateDoc(userChatsRef, {
              chatsData: updatedChatsData
            });
          }
        }
      }));

      setInput("");
    } catch (error) {
      toast.error("Failed to send message: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const sendImage = async (e) => {
    if (!e.target.files?.[0] || !messagesId || isLoading) return;

    setIsLoading(true);
    try {
      const fileUrl = await upload(e.target.files[0]);
      if (!fileUrl) throw new Error("Failed to upload image");

      const messageData = {
        sId: userData.id,
        image: fileUrl,
        createdAt: Timestamp.now() 
      };

      await updateDoc(doc(db, 'messages', messagesId), {
        messages: arrayUnion(messageData)
      });

      // Update chats for both users
      const userIDs = [chatUser.rId, userData.id];
      await Promise.all(userIDs.map(async (id) => {
        const userChatsRef = doc(db, 'chats', id);
        const userChatsSnapshot = await getDoc(userChatsRef);

        if (userChatsSnapshot.exists()) {
          const userChatData = userChatsSnapshot.data();
          const chatIndex = userChatData.chatsData.findIndex(
            (c) => c.messageId === messagesId
          );

          if (chatIndex !== -1) {
            const updatedChatsData = [...userChatData.chatsData];
            updatedChatsData[chatIndex] = {
              ...updatedChatsData[chatIndex],
              lastMessage: "Image",
              updatedAt: Date.now(),
              messageSeen: id === userData.id
            };

            await updateDoc(userChatsRef, {
              chatsData: updatedChatsData
            });
          }
        }
      }));

      // Clear the file input
      e.target.value = '';
    } catch (error) {
      toast.error("Failed to send image: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let unSub;
    if (messagesId) {
      unSub = onSnapshot(doc(db, 'messages', messagesId), (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          setMessages(data.messages?.reverse() || []);
        }
      });
    }
    return () => unSub?.();
  }, [messagesId, setMessages]);

  const convertTimestamp = (timestamp) => {
    if (!timestamp || !timestamp.toDate) return "";
    const date = timestamp.toDate();
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes} ${period}`;
  };

  if (!chatUser) {
    return (
      <div className={`chat-welcome ${(chatVisible && !showRight) ? "" : "hidden"}`}>
        <img src={assets.logo_icon} alt="" />
        <p>Chat anytime, anywhere</p>
      </div>
    );
  }

  return (
    <div className={`chat-box ${(chatVisible && !showRight) ? "" : "hidden"}`}>
      <div className="chat-user">
        <img 
          onClick={() => setShowRight(true)} 
          src={chatUser.userData.avatar} 
          alt="User avatar" 
        />
        <p>
          {chatUser.userData.name}
          {Date.now() - chatUser.userData.lastSeen <= 70000 && (
            <img className="dot" src={assets.green_dot} alt="Online indicator" />
          )}
        </p>
        <img 
          onClick={() => setChatVisible(false)} 
          src={assets.arrow_icon} 
          className="arrow" 
          alt="Close chat" 
        />
      </div>

      <div className="chat-msg">
        {messages.map((msg, index) => (
          <div key={index} className={msg.sId === userData.id ? "s-msg" : "r-msg"}>
            {msg.image ? (
              <img className="msg-img" src={msg.image} alt="Shared image" />
            ) : (
              <p className="msg">{msg.text}</p>
            )}
            <div>
              <img
                src={msg.sId === userData.id ? userData.avatar : chatUser.userData.avatar}
                alt="User avatar"
              />
              <p>{convertTimestamp(msg.createdAt)}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="chat-input">
        <input
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          value={input}
          type="text"
          placeholder="Send a message"
          disabled={isLoading}
        />
        <input
          onChange={sendImage}
          type="file"
          id="image"
          accept="image/png, image/jpeg"
          hidden
          disabled={isLoading}
        />
        <label htmlFor="image">
          <img src={assets.gallery_icon} alt="Upload image" />
        </label>
        <img 
          onClick={sendMessage} 
          src={assets.send_button} 
          alt="Send message"
          style={{ cursor: isLoading ? 'not-allowed' : 'pointer' }}
        />
      </div>
    </div>
  );
};

export default ChatBox;