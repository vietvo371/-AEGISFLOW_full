import AsyncStorage from "@react-native-async-storage/async-storage";
import { CommonActions, NavigationProp } from '@react-navigation/native';
import api from "./Api";
import Toast from "react-native-toast-message";

export const saveToken = async (token: string) => {
    try {
        await AsyncStorage.setItem('@auth_token', token);
        console.log('Token saved successfully');
    } catch (error) {
        console.error('Error saving token:', error);
        throw error;
    }
}

export const getToken = async () => {
    try {
        return await AsyncStorage.getItem('@auth_token');
    } catch (error) {
        console.error('Error getting token:', error);
        return null;
    }
}

export const removeToken = async () => {
    try {
        await AsyncStorage.removeItem('@auth_token');
        console.log('Token removed successfully');
    } catch (error) {
        console.error('Error removing token:', error);
        throw error;
    }
}

export const checkToken = async (navigation: NavigationProp<any>) => {
    try {
        const token = await getToken();
        if (token) {
            const res = await api.get('/check-login');
            if (res.data?.status) {
                // Update token if a new one is provided
                const newToken = res.data?.token ?? res.data?.data?.token;
                if (newToken && newToken !== token) {
                    await saveToken(newToken);
                }
                return true;
            } else {
                // Token is invalid, clear it and redirect to login
                await removeToken();
                navigation.dispatch(
                    CommonActions.reset({
                        index: 0,
                        routes: [{ name: "Login" }],
                    })
                );
                Toast.show({
                    text1: 'Vui lòng đăng nhập hệ thống!',
                    type: 'error',
                });
                return false;
            }
        }
        return false;
    } catch (error) {
        console.error('Token check error:', error);
        // Clear token on error and redirect to login
        await removeToken();
        navigation.dispatch(
            CommonActions.reset({
                index: 0,
                routes: [{ name: "Login" }],
            })
        );
        Toast.show({
            text1: 'Vui lòng đăng nhập hệ thống!',
            type: 'error',
        });
        return false;
    }
}
export const saveUser = async (user: any) => {
    try {
        await AsyncStorage.setItem('@user_data', JSON.stringify(user));
        console.log('User saved successfully');
    } catch (error) {
        console.error('Error saving user:', error);
        throw error;
    }
}
export const getUser = async () => {
    try {
        const user = await AsyncStorage.getItem('@user_data');
        return JSON.parse(user || '{}');
    } catch (error) {
        console.error('Error getting user:', error);
        return null;
    }
}
export const removeUser = async () => {
    try {
        await AsyncStorage.removeItem('@user_data');
        console.log('User removed successfully');
    } catch (error) {
        console.error('Error removing user:', error);
        throw error;
    }
}