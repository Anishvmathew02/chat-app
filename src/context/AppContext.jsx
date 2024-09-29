import { doc, getDoc, onSnapshot, updateDoc } from "firebase/firestore";
import { createContext, useEffect, useState } from "react";
import { auth, db } from "../config/firebase";
import { useNavigate } from "react-router-dom";

export const AppContext = createContext();

const AppContextProvider = (props) => {
  
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [chatData, setChatData] = useState(null);
  const [messagesId, setMessagesId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatUser, setChatUser] = useState(null);
  const [chatVisible, setChatVisible] = useState(false);
  const [showRight, setShowRight] = useState(false);

  const loadUserData = async (uid) => {
    try {
        const userRef = doc(db, 'users', uid);
        const userSnap = await getDoc(userRef);
        const userData = userSnap.data();
        setUserData(userData);
        if (userData.avatar && userData.name) {
            navigate('/chat');
        }
        else{
            navigate('/profile')
        }
        await updateDoc(userRef,{
            lastSeen:Date.now()
        })
        setInterval(async () => {
            if(auth.chatUser){
                await updateDoc(userRef,{
                    lastSeen:Date.now()
                })
            }
        }, 60000);
    } catch (error) {
        
    }
  }


  useEffect(() => {
    if (userData) {
      const chatRef = doc(db, 'chats', userData.id);
      const unSub = onSnapshot(chatRef, async (res) => {
        try {
          const snapshotData = res.data();  
          // Check if chatsData exists and is an array
          const chatItems = Array.isArray(snapshotData?.chatsData) ? snapshotData.chatsData : [];
          // If there are no chat items, set chatData to an empty array and return
          if (chatItems.length === 0) {
            setChatData([]);
            return;
          }
          // Fetch additional user data for each chat item
          const tempData = [];
          for (const item of chatItems) {
            const userRef = doc(db, 'users', item.rId);
            const userSnap = await getDoc(userRef);
            const userData = userSnap.data();
            tempData.push({ ...item, userData });
          }
          // Sort the chat data by updatedAt and update the state
          setChatData(tempData.sort((a, b) => b.updatedAt - a.updatedAt));
        } catch (error) {
          console.error('Error fetching chat data:', error);
        }
      });
      return () => {
        unSub();
      };
    }
  }, [userData]);


  const value = {
    userData,setUserData,
    chatData,setChatData,
    loadUserData,
    messages, setMessages,
    messagesId, setMessagesId,
    chatUser, setChatUser,
    chatVisible, setChatVisible,
    showRight, setShowRight
  };
  return (
    <AppContext.Provider value={value}>
        {props.children}
    </AppContext.Provider>
  );
};

export default AppContextProvider;