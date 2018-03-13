import React, { Component } from 'react'
import { View, Alert, Dimensions, KeyboardAvoidingView, SafeAreaView, Clipboard, Keyboard } from 'react-native'
import Modal from 'react-native-modal'
import uuid from 'uuid/v4'
import { observer, inject } from 'mobx-react'
import base64 from 'base-64'
import base64js from 'base64-js'
import crypto from 'crypto-js'
import Icon from 'react-native-vector-icons/Feather'
import Button from 'react-native-micro-animated-button'
import SInfo from 'react-native-sensitive-info';
import { Keypair } from 'stellar-sdk';
import SecretList from '../components/SecretList'
import {
  Screen,
  ContainerFlex,
  Header,
  Title,
  LoadButton,
  TextInput,
  ErrorLabel,
  CloseButton,
  CardFlex,
  CardRow,
  CardLabel,
	CardTitle,
	LoadButtonWrapper,
	TitleWrapper,
	MiniPasteButton
} from '../components/utils'

import PouchDB from 'pouchdb-react-native'
import SQLite from 'react-native-sqlite-2'
import SQLiteAdapterFactory from 'pouchdb-adapter-react-native-sqlite'
const SQLiteAdapter = SQLiteAdapterFactory(SQLite)
PouchDB.plugin(SQLiteAdapter)
const db = new PouchDB('Secrets', { adapter: 'react-native-sqlite' })

@inject('appStore') @observer
class SecretsScreen extends Component {
  state = {
    sk: undefined,
    alias: undefined,
    hasError: false,
    secrets: []
  }

  componentDidMount() {
		this.loadData();
	}
	
	loadData = () => {
		let self = this;
		db.allDocs({
			include_docs: true
		}).then((res)=> {
			self.setState({ secrets: res.rows, isLoadingList: false });
		})
	}

  toggleAddModal = () => {
    const { appStore } = this.props
    appStore.set('isAddSecretModalVisible', !appStore.get('isAddSecretModalVisible'))
  }

  handleInputErrors = () => {
    const { sk, alias } = this.state
  }

  addSecretToStore = () => {
    const { sk, alias } = this.state
    if (!sk || !alias) {
      this.setState({ hasError: true })
      this.addSecretButton.error()
      this.addSecretButton.reset()
    } else {
      this.addSecretButton.success()
      this.toggleAddModal()
      this.saveSecret({ sk: sk.trim(), alias: alias.trim() })
      this.setState({ hasError: false, sk: undefined, alias: undefined })
    }
	}
	
	encryptSecret = (_id, sk) => {
		const pwd = this.props.appStore.get('pwd');
		var ciphertext = crypto.AES.encrypt(sk, `${_id}:${pwd}`);
		SInfo.setItem(_id, ciphertext.toString(), {});
	}

  saveSecret = ({ sk, alias }) => {
		const _id = uuid();
		try {
			db.put({
				_id,
				alias,
				sk: `${sk.slice(0,8)}...${sk.substr(sk.length - 8)}`,
				createdAt: new Date().toISOString()
			});
			this.encryptSecret(_id, sk)
			this.loadData();
		} catch (error) {
			alert(error.message)
		}
  }

  deleteSecret = async doc => {
		try {
			const res = await db.remove(doc);
			this.loadData();
		} catch (error) {
			alert(error.message);
		}
  }

  showSecretAlert = item => {
    Alert.alert(
      `${item.alias}`,
      `${item.sk}`,
      [
        {
          text: 'Delete',
          onPress: () => this.deleteSecret(item),
          style: 'cancel'
        },
        { text: 'Close', onPress: () => {} } // Do not button
      ],
      { cancelable: false }
    )
	}
	
	pasteHandler = async () => {
    const content = await Clipboard.getString()
		this.setState({ sk: content })
  }

  render() {
    const { appStore } = this.props
    const { sk, alias, hasError, secrets } = this.state
    const isAddSecretModalVisible = appStore.get('isAddSecretModalVisible')

    return (
			<SafeAreaView style={{ backgroundColor: 'blue' }}>
				<Screen>
					<Header>
							<TitleWrapper>
								<Title>My Secrets</Title>
								</TitleWrapper>
								<LoadButtonWrapper>
								<LoadButton onPress={this.toggleAddModal}>
									<Icon name="plus-circle" color="white" size={32} />
								</LoadButton>
						</LoadButtonWrapper>					
					</Header>
					<SecretList secrets={secrets} show={this.showSecretAlert} />
					<Modal isVisible={isAddSecretModalVisible}>
						<SafeAreaView style={{ flex: 1 }}>
							<ContainerFlex>
								<CloseButton onPress={this.toggleAddModal}>
									<Icon name="x-circle" color="white" size={32} />
								</CloseButton>
								<CardFlex>
									<TextInput
										autoCorrect={false}
										placeholder="Label"
										onChangeText={alias => this.setState({ alias })}
										clearButtonMode={'always'}
										underlineColorAndroid={'white'}
										value={alias}
									/>
									<View style={{ flexDirection: 'row' }}>
										<TextInput
											autoCorrect={false}
											placeholder="Secret Key"
											onChangeText={sk => this.setState({ sk })}
											clearButtonMode={'always'}
											underlineColorAndroid={'white'}
											value={sk}
											style={{ flex: 1, marginRight: 16, }}
										/>
										<MiniPasteButton onPress={this.pasteHandler}>
											<Icon name="file-text" color="gray" size={24} />
										</MiniPasteButton>
									</View>
									<View>
										{hasError && <ErrorLabel>Invalid secret or label.</ErrorLabel>}
									</View>
								</CardFlex>
								<KeyboardAvoidingView>
									<View style={{ alignSelf: 'center', paddingTop: 8 }}>
										<Button
											ref={ref => (this.addSecretButton = ref)}
											foregroundColor={'#4cd964'}
											onPress={this.addSecretToStore}
											foregroundColor={'white'}
											backgroundColor={'#4cd964'}
											successColor={'#4cd964'}
											errorColor={'#ff3b30'}
											errorIconColor={'white'}
											successIconColor={'white'}
											successIconName="check"
											label="Save"
											maxWidth={100}
											style={{ borderWidth: 0 }}
										/>
									</View>
								</KeyboardAvoidingView>
							</ContainerFlex>
						</SafeAreaView>
					</Modal>
				</Screen>
			</SafeAreaView>
    )
  }
}

export default SecretsScreen
