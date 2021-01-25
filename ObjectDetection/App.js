import React, { Fragment, Component } from 'react';
import * as ImagePicker from 'react-native-image-picker';
import ImgToBase64 from 'react-native-image-base64';
import * as firebase from 'firebase';
import storage from '@react-native-firebase/storage';
import vision from "react-cloud-vision-api";
vision.init({ auth: 'AIzaSyCh4nquaQijNmaNYyuuKYp0VJlo9htukJ8'})

import { Alert } from 'react-native';

import {
  SafeAreaView,
  StyleSheet,
  ScrollView,
  View,
  Text,
  StatusBar,
  Image,
  Button,
  Dimensions,
  TouchableOpacity
} from 'react-native';

import {
  Header,
  LearnMoreLinks,
  Colors,
  DebugInstructions,
  ReloadInstructions,
} from 'react-native/Libraries/NewAppScreen';

const options = {
  title: 'Select Avatar',
  customButtons: [{ name: 'fb', title: 'Choose Photo from Facebook' }],
  storageOptions: {
    skipBackup: true,
    path: 'image',
  },
};
export default class App extends Component {
  constructor(props) {
    super(props)
    this.state = {
      filepath: {
        data: '',
        uri: ''
      },
      fileData: '',
      fileUri: '',
      base64String: null,
      base64String2: null,
      result: null,
      storageResponseUrl: null,
    }
  }

  launchCamera = () => {
    let options = {
      storageOptions: {
        skipBackup: true,
        path: 'images',
      },
    };
    ImagePicker.launchCamera(options, (response) => {
      console.log('Response = ', response);

      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.error) {
        console.log('ImagePicker Error: ', response.error);
      } else if (response.customButton) {
        console.log('User tapped custom button: ', response.customButton);
        alert(response.customButton);
      } else {
        const source = { uri: response.uri };
        console.log('response', JSON.stringify(response));
        this.setState({
          filePath: response,
          fileData: response.data,
          fileUri: response.uri
        });
      }
    });

  }

  
  chooseImage = () => {
    let options = {
      storageOptions: {
        skipBackup: true,
        path: 'image',
      },
    };
    ImagePicker.launchImageLibrary(options, (response) => {
      console.log('Response = ', response);

      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.error) {
        console.log('ImagePicker Error: ', response.error);
      } else if (response.customButton) {
        console.log('User tapped custom button: ', response.customButton);
        alert(response.customButton);
      } else {
        source = response.uri ;
        console.log('response', JSON.stringify(response));
        this.setState({
          filePath: response,
          fileData: response.data,
          fileUri: response.uri
        });
      }      
      //We need to base64 data. So, transform uri to base64String easily!
      ImgToBase64.getBase64String(this.state.fileUri)
      .then((base64String) => {
        this.state.base64String = base64String;
      })
      .catch((err) => console.log(err));    

      //Config information. Coming from Firebase Cloud Storage.
      if (!firebase.apps.length) {
        firebase.initializeApp({
          apiKey: "AIzaSyCh4nquaQijNmaNYyuuKYp0VJlo9htukJ8",                             // Auth / General Use
          appId: "1:729608999549:android:a8fdfb6ae9c43d032c1714",      // General Use
          projectId: "object-detection-4156d",               // General Use
          authDomain: "object-detection-4156d.firebaseapp.com",         // Auth with popup/redirect
          databaseURL: "https://object-detection-4156d-default-rtdb.firebaseio.com/", // Realtime Database
          storageBucket: "object-detection-4156d.appspot.com",          // Storage
          //messagingSenderId: "123456789",                  // Cloud Messaging
          //measurementId: "G-12345"                        // Analytics
        });
        console.log("firestone api has been initialized");
     }else {
       // if already initialized, use that one
        firebase.app(); 
     }

    //Get only filename . ex: image.jpeg
    const filename = response.uri.substring(response.uri.lastIndexOf('/') + 1);
    
    //Put file into the Firebase Storage
    storage().ref(filename).putFile(this.state.fileUri).then((snapshot) => {
      //You can check the image is now uploaded in the storage bucket
      console.log(`${filename} has been successfully uploaded.`);
      Alert.alert(
        'Photo uploaded!',
        'Your photo has been uploaded to Firebase Cloud Storage!'
      );
    })
  .catch((e) => console.log('uploading image error => ', e));
    
    });

  }

  
  processData = async () => {
  
      //Firebase Url transform to base64String
      ImgToBase64.getBase64String(this.state.storageResponseUrl)
      .then((base64String) => {
        this.state.base64String = base64String;
      })
      .catch((err) => console.log(err));

      let googleVisionRes = await fetch('https://vision.googleapis.com/v1/images:annotate?key=AIzaSyCh4nquaQijNmaNYyuuKYp0VJlo9htukJ8', {
        method: 'POST',
        body: JSON.stringify({
          requests: [
            {
              image: {
                content: this.state.base64String,
              },
              features: [{maxResults: 55, type: 'OBJECT_LOCALIZATION'}],
            },
          ],
        }),
      });
  
      await googleVisionRes
        .json()
        .then((googleVisionRes) => {
          console.log('Response:');

          //Logging Console every single object features.
          for(let i=0;i<googleVisionRes.responses[0].localizedObjectAnnotations.length;i++){
            console.log('Object ',i);
            console.log('Object name:', googleVisionRes.responses[0].localizedObjectAnnotations[i].name);
            console.log('Object score:', googleVisionRes.responses[0].localizedObjectAnnotations[i].score);
            for(let j=0;j<4;j++){
              console.log('Object position x coordinate:', googleVisionRes.responses[0].localizedObjectAnnotations[i].boundingPoly.normalizedVertices[j].x);
              console.log('Object position y coordinate:', googleVisionRes.responses[0].localizedObjectAnnotations[i].boundingPoly.normalizedVertices[j].y);
            }            
          }
          console.log(googleVisionRes.responses[0].localizedObjectAnnotations.length+' objects is determined!');         
        })
        .catch((error) => {
          console.log(error);
        });

  }

  getImageFromStorage = async () => {
    //Getting from last img in bucket in Firebase db.
    const filename = this.state.fileUri.substring(this.state.fileUri.lastIndexOf('/') + 1);
    
    const data = 'gs://object-detection-4156d.appspot.com/';

    const file_data =  data + filename;

    const url = await storage().refFromURL(file_data).getDownloadURL();

    console.log("url :" + url);

    this.state.storageResponseUrl = url;

    this.processData();

  }

  renderFileUri() {
    if (this.state.fileUri) {
      return <Image
      source={{ uri: this.state.fileUri }}
      style={styles.images}
    />
    } else {
      return <Image
        source={require('./assets/galeryImages.png')}
        style={styles.images}
      />
    }
  }

  //Rendering everything in React-Native Mobile-App
  render() {
    return (
      <Fragment>
        <StatusBar barStyle="dark-content" />
        <SafeAreaView>
          <View style={styles.body}>
            <Text style={{textAlign:'center',fontSize:20,paddingBottom:10}} ></Text>
            <View style={styles.ImageSections}>
              <View>
                {this.renderFileUri()}
                <Text style={{textAlign:'center'}}>File</Text>
              </View>
            </View>

            <View style={styles.btnParentSection}>

              <TouchableOpacity onPress={this.launchCamera} style={styles.btnSection}  >
                <Text style={styles.btnText}>Launch Camera</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={this.chooseImage} style={styles.btnSection}  >
                <Text style={styles.btnText}>Choose Image in Library</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={this.getImageFromStorage} style={styles.btnSection}  >
                <Text style={styles.btnText}>Get Image Result</Text>
              </TouchableOpacity>
            </View>

          </View>
        </SafeAreaView>
      </Fragment>
    );
  }
};

const styles = StyleSheet.create({
  scrollView: {
    backgroundColor: Colors.lighter,
  },

  body: {
    backgroundColor: Colors.white,
    justifyContent: 'center',
    borderColor: 'black',
    borderWidth: 1,
    height: Dimensions.get('screen').height - 20,
    width: Dimensions.get('screen').width
  },
  ImageSections: {
    display: 'flex',
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 8,
    justifyContent: 'center'
  },
  images: {
    width: 150,
    height: 150,
    borderColor: 'black',
    borderWidth: 1,
    marginHorizontal: 3
  },
  btnParentSection: {
    alignItems: 'center',
    marginTop:10
  },
  btnSection: {
    width: 225,
    height: 50,
    backgroundColor: '#DCDCDC',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 3,
    marginBottom:10
  },
  btnText: {
    textAlign: 'center',
    color: 'gray',
    fontSize: 14,
    fontWeight:'bold'
  }
});
